import { parseContractRules } from "../storyTree/contractRules.js";
import {
  classifyRecordRow,
  diffRecordTables,
  type RecordRow,
  type RecordTableKind,
} from "../storyTree/tables.js";
import { DEFAULT_SPECS_DIR, STORY_AUTHORING_KINDS } from "./common.js";
import type {
  InputRefusal,
  WorkflowEvent,
  WorkflowFacts,
  WorkflowObligationSet,
  WorkflowRecordsAtIssue,
  WorkflowResult,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./types.js";

const refused = (reason: InputRefusal["reason"], subjects: readonly string[]) =>
  subjects.map((subject): InputRefusal => ({ reason, subject }));

// An example a test annotated at issue that no test annotates now, and an example the stage
// added. A story-authoring stage may add examples, and an example it removed is its own change.
function obligationRefusals(
  issued: WorkflowObligationSet | undefined,
  facts: WorkflowFacts,
  storyAuthoring: boolean,
): InputRefusal[] {
  const now = facts.obligations;
  if (!issued || now?.flowId !== issued.flowId) return [];
  const removed = (id: string) => !now.exampleIds.includes(id);
  const uncovered = issued.annotated.filter(
    (id) => !now.annotated.includes(id) && !(storyAuthoring && removed(id)),
  );
  const added = storyAuthoring
    ? []
    : now.exampleIds.filter((id) => !issued.exampleIds.includes(id));
  return [...refused("example-uncovered", uncovered), ...refused("example-added", added)];
}

const APPROVAL_REQUIRED = ["CREATE", "DELETE", "SPLIT", "MERGE", "SUPERSEDE", "UPDATE:REMOVE"];

// SIMPLIFIED: the operation of a triage row is the first operation token of its Content.
// Lift when: a triage row is found whose operation stands elsewhere in its Content.
function operationOf(row: RecordRow): string | undefined {
  return /\b(CREATE|DELETE|SPLIT|MERGE|SUPERSEDE|UPDATE(?::[A-Z]+)?)\b/.exec(row.content)?.[1];
}

// Rows present at issue keep their ID, Content and Approach and stay in the table; only a row
// this run appended may change its Status.
function rewrittenRows(
  issued: string,
  now: string,
  kind: RecordTableKind,
  appendedByRun: readonly string[],
): { rewritten: string[]; appended: RecordRow[] } {
  const diff = diffRecordTables(issued, now, kind);
  const moved = diff.changed
    .filter((cell) => cell.cell === "status" && !appendedByRun.includes(cell.id))
    .map((cell) => cell.id);
  const rewritten = [
    ...diff.removed.map((row) => row.id),
    ...diff.rewritten.map((cell) => cell.id),
    ...moved,
  ];
  return { rewritten: [...new Set(rewritten)], appended: diff.appended };
}

// Whether a row's Approach cites a `human_decision` this run recorded for the operation, as
// `<runId>/<authorizationId>`, and repeats its `answeredBy`.
function citesAnswer(snapshot: WorkflowSnapshot, row: RecordRow, operation: string): boolean {
  return (snapshot.authorizations ?? []).some(
    (authorization) =>
      authorization.kind === "human_decision" &&
      authorization.operation === operation &&
      row.approach.includes(`${snapshot.run.id}/${authorization.authorizationId}`) &&
      Boolean(authorization.answeredBy) &&
      row.approach.includes(authorization.answeredBy ?? ""),
  );
}

// An appended row that needs an approval may stand at WIP or DONE only with the answer cited.
function unauthorizedRows(snapshot: WorkflowSnapshot, appended: readonly RecordRow[]): string[] {
  return appended.flatMap((row) => {
    if (row.status !== "WIP" && row.status !== "DONE") return [];
    const changeRequest = classifyRecordRow(row).kind === "change-request";
    const operation = operationOf(row);
    if (!changeRequest && !APPROVAL_REQUIRED.includes(operation ?? "")) return [];
    // A CREATE answers its slot's `create` question; every other change answers the stage's own.
    const answered = !changeRequest && operation === "CREATE" ? "CREATE" : "CHANGE_REQUEST";
    return citesAnswer(snapshot, row, answered) ? [] : [row.id];
  });
}

// The story-tree and contract files a result changed, which a change request must name.
function authoredFiles(result: WorkflowResult, facts: WorkflowFacts): string[] {
  const specs = facts.specsDir ?? DEFAULT_SPECS_DIR;
  const contracts = facts.contractsDir ?? `${specs}/03_contract`;
  const roots = [`${specs}/01_policy/`, `${specs}/02_business-flow/`, `${contracts}/`];
  return (result.changedFiles ?? [])
    .map((changed) => changed.path)
    .filter((file) => roots.some((root) => file.startsWith(root)));
}

// Every story-tree or contract file the result changed is named by one appended change request
// row, already in force and citing this run's answer to the stage's change question. A result
// still waiting for that answer changes none.
function unrequestedFiles(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  facts: WorkflowFacts,
  appended: readonly RecordRow[],
): string[] {
  const files = authoredFiles(result, facts);
  if (files.length === 0) return [];
  if (result.outcome === "awaiting_input") return files;
  const named = appended
    .map((row) => classifyRecordRow(row))
    .filter((row) => row.kind === "change-request" && row.inForce)
    .filter((row) => citesAnswer(snapshot, row.row, "CHANGE_REQUEST"))
    .map((row) => row.refs);
  return named.some((refs) => files.every((file) => refs.includes(file))) ? [] : files;
}

// The lines of `before` and `after` that differ, when the two have the same number of lines.
function changedLines(before: string, after: string): number[] | undefined {
  const [left, right] = [before.split(/\r?\n/), after.split(/\r?\n/)];
  if (left.length !== right.length) return undefined;
  return left.flatMap((line, index) => (line === right[index] ? [] : [index]));
}

// Defect example seeding changes its contract only by adding the new example's ID to one rule's
// Examples cell: every rule keeps its ID and Statement, and nothing else in the file moves.
function ruleChanges(contract: WorkflowRecordsAtIssue["contract"], facts: WorkflowFacts) {
  const now = facts.records?.contract;
  if (!contract || now?.path !== contract.path) return [];
  const before = parseContractRules(contract.path, contract.text).rules;
  const after = parseContractRules(now.path, now.text).rules;
  const kept = (rule: (typeof before)[number]) =>
    after.some((each) => each.id === rule.id && each.statement === rule.statement);
  const grown = after.filter((rule) => {
    const was = before.find((each) => each.id === rule.id);
    return was !== undefined && rule.examples.length !== was.examples.length;
  });
  const lines = changedLines(contract.text, now.text);
  const intact =
    before.length === after.length &&
    before.every(kept) &&
    grown.length <= 1 &&
    grown.every((rule) => {
      const was = before.find((each) => each.id === rule.id)?.examples ?? [];
      return (
        rule.examples.length === was.length + 1 && was.every((id) => rule.examples.includes(id))
      );
    }) &&
    lines !== undefined &&
    lines.length <= 1;
  return intact ? [] : [contract.path];
}

// The records check of a story-authoring result, against the records as they stood at issue.
function recordRefusals(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  facts: WorkflowFacts,
): { refusals: InputRefusal[]; appended: string[] } {
  const issued = snapshot.issuedRecords;
  const now = facts.records;
  if (!issued || !now) return { refusals: [], appended: [] };
  const byRun = snapshot.appendedRows ?? [];
  const decisions = rewrittenRows(issued.decisions, now.decisions, "decisions", byRun);
  const questions = rewrittenRows(issued.openQuestions, now.openQuestions, "open-questions", byRun);
  const unauthorized = [
    ...unauthorizedRows(snapshot, decisions.appended),
    ...unrequestedFiles(snapshot, result, facts, decisions.appended),
  ];
  const rules = workOrder.stageKind === "sdd_append" ? ruleChanges(issued.contract, facts) : [];
  return {
    refusals: [
      ...refused("record-rewritten", [...decisions.rewritten, ...questions.rewritten]),
      ...refused("record-unauthorized", unauthorized),
      ...refused("rule-changed", rules),
    ],
    appended: [...decisions.appended, ...questions.appended].map((row) => row.id),
  };
}

// The story-tree checks `accept` runs on a stage result: the obligation check on every stage,
// and the records check on a story-authoring stage. `extras` is what the accepted event keeps.
export function storyTreeChecks(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  facts: WorkflowFacts,
): { refusals: InputRefusal[]; extras: Partial<WorkflowEvent> } {
  const storyAuthoring = STORY_AUTHORING_KINDS.includes(workOrder.stageKind);
  const obligations = obligationRefusals(snapshot.issuedObligations, facts, storyAuthoring);
  if (!storyAuthoring) return { refusals: obligations, extras: {} };
  const records = recordRefusals(snapshot, workOrder, result, facts);
  return {
    refusals: [...obligations, ...records.refusals],
    extras: records.appended.length > 0 ? { appendedRows: records.appended } : {},
  };
}
