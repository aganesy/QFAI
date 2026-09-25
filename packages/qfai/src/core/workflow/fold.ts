import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { scopeDigestOf } from "./common.js";
import { isRecord } from "./parse.js";
import { writeRecord } from "./persistence.js";
import type { IoRefusal, JournalRecord, WorkflowReplay } from "./persistence.js";
import type { WorkflowDecision, WorkflowEvent, WorkflowSnapshot } from "./types.js";

type Snapshot = WorkflowSnapshot;

// The snapshot is the journal folded from its first event; it holds nothing the journal lacks.
export function snapshotOf(records: readonly JournalRecord[]): WorkflowSnapshot | null {
  let snapshot: WorkflowSnapshot | null = null;
  for (const record of records) snapshot = foldRecord(snapshot, record);
  return snapshot;
}

export async function writeSnapshot(
  runDir: string,
  snapshot: WorkflowSnapshot,
): Promise<IoRefusal | undefined> {
  const { digestKey: _private, ...stored } = snapshot;
  const content = `${JSON.stringify({ ...stored, reflects: snapshot.run.sequence }, null, 2)}\n`;
  return writeRecord(path.join(runDir, "snapshot.json"), content);
}

function withoutWorkOrder(snapshot: Snapshot): Snapshot {
  const { outstandingWorkOrder: _done, ...rest } = snapshot;
  return rest;
}

function foldIssued(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const workOrder = record.workOrder;
  if (!workOrder) return snapshot;
  const attempts = { ...snapshot.attempts, [workOrder.stageInstanceId]: workOrder.attempt };
  const issuedRecordAreas = [
    ...new Set([...(snapshot.issuedRecordAreas ?? []), ...(workOrder.recordAreas ?? [])]),
  ];
  const { issuedObligations: _set, issuedRecords: _records, ...rest } = snapshot;
  return {
    ...rest,
    outstandingWorkOrder: workOrder,
    attempts,
    issuedRecordAreas,
    ...(record.obligationSet ? { issuedObligations: record.obligationSet } : {}),
    ...(record.recordsAtIssue ? { issuedRecords: record.recordsAtIssue } : {}),
  };
}

function foldRouted(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const plan = record.plan ?? snapshot.plan;
  const writeScope = record.proposal?.proposedWriteScope ?? plan?.writeScope;
  return {
    ...withoutWorkOrder(snapshot),
    ...(plan ? { plan } : {}),
    ...(record.settled ? { settled: record.settled } : {}),
    ...(writeScope ? { scopeDigest: scopeDigestOf(writeScope) } : {}),
  };
}

function foldQuestion(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const question = record.question;
  if (!question) return snapshot;
  const stories = question.story ? [...(snapshot.stories ?? []), question.story] : snapshot.stories;
  return {
    ...snapshot,
    openQuestions: [...(snapshot.openQuestions ?? []), question],
    ...(stories ? { stories } : {}),
  };
}

function foldAuthorization(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const authorization = record.authorization;
  if (!authorization) return snapshot;
  const openQuestions = (snapshot.openQuestions ?? []).filter(
    (question) => question.questionId !== authorization.questionId,
  );
  const { authorizationId, kind, operation, answeredBy } = authorization;
  const authorizations = [
    ...(snapshot.authorizations ?? []),
    { authorizationId, kind, operation, answeredBy },
  ];
  const approval =
    authorization.operation === "CREATE"
      ? {
          authorizationId,
          scopeDigest: authorization.scopeDigest,
          kind,
          operation,
          effect: authorization.effect,
          ...(authorization.target ? { target: authorization.target } : {}),
        }
      : snapshot.approval;
  return {
    ...snapshot,
    openQuestions,
    authorizations,
    ...(approval ? { approval } : {}),
    ...(record.settled ? { settled: record.settled } : {}),
  };
}

// An acceptance result asking for a seam opens the seam request instead of completing its stage,
// and the seam-only result closes it; neither is an accepted plan stage. The acceptance stage is
// then reissued at its next attempt.
function foldSeam(snapshot: Snapshot, record: JournalRecord): Snapshot | undefined {
  const order = snapshot.outstandingWorkOrder;
  if (!order) return undefined;
  if (record.seamRequest) {
    const seamRequest = {
      parentWorkOrderId: order.workOrderId,
      stageInstanceId: order.stageInstanceId,
      attempt: order.attempt,
      targetTestId: record.seamRequest.targetTestId,
    };
    return { ...withoutWorkOrder(snapshot), seamRequest };
  }
  if (order.operation !== "seam-only" || !snapshot.seamRequest) return undefined;
  const { seamRequest: _closed, ...rest } = withoutWorkOrder(snapshot);
  return rest;
}

// A `needs_repair` result is routing data: its stage stays unaccepted, so `next` reissues it as
// a new attempt, and each cause it lists counts one automatic repair.
function foldRepair(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const counts = [...(snapshot.repairsByCause ?? [])];
  for (const debt of record.repairs ?? []) {
    const at = counts.findIndex(
      (cause) => cause.findingCode === debt.findingCode && cause.path === debt.path,
    );
    const count = (counts[at]?.count ?? 0) + 1;
    const entry = { findingCode: debt.findingCode, path: debt.path, count };
    if (at < 0) counts.push(entry);
    else counts[at] = entry;
  }
  return { ...withoutWorkOrder(snapshot), repairsByCause: counts };
}

function acceptedStageOf(snapshot: Snapshot, record: JournalRecord) {
  return {
    stageInstanceId: record.stageInstanceId ?? "",
    stageKind: record.stageKind ?? snapshot.outstandingWorkOrder?.stageKind ?? "",
    outcome: record.outcome ?? "",
    ...(record.resultRef ? { receiptRef: record.resultRef } : {}),
    ...(record.gateResults ? { gateResults: record.gateResults } : {}),
    ...(record.reviewResults ? { reviewResults: record.reviewResults } : {}),
    ...(record.debts ? { debts: record.debts } : {}),
    ...(record.reports ? { reports: record.reports } : {}),
    ...(record.dependencies ? { dependencies: record.dependencies } : {}),
    ...(record.testObservation ? { testObservation: record.testObservation } : {}),
  };
}

function foldAccepted(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const seam = foldSeam(snapshot, record);
  if (seam) return seam;
  const replans =
    (snapshot.replans ?? 0) + (record.event === "scope-or-obligation-revision" ? 1 : 0);
  if (record.outcome === "needs_repair") {
    return { ...foldRepair(snapshot, record), ...(replans > 0 ? { replans } : {}) };
  }
  const { halt: _cleared, ...rest } = withoutWorkOrder(snapshot);
  const appendedRows = [...(snapshot.appendedRows ?? []), ...(record.appendedRows ?? [])];
  return {
    ...rest,
    acceptedStages: [...(snapshot.acceptedStages ?? []), acceptedStageOf(snapshot, record)],
    ...(record.diagnosis ? { diagnosis: record.diagnosis } : {}),
    ...(replans > 0 ? { replans } : {}),
    ...(appendedRows.length > 0 ? { appendedRows } : {}),
  };
}

// A flow bound at routing names the flow alone; one a new-story slot bound names the slot too.
function foldBinding(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const flowId = record.flowId ?? record.binding?.flowId;
  return flowId ? { ...snapshot, flowBinding: { flowId } } : snapshot;
}

function foldReplay(snapshot: Snapshot, replay: WorkflowReplay): Snapshot {
  const [kind, id = ""] = replay.key.split(":");
  if (kind === "stop") return { ...snapshot, stopVerdict: replay.verdict };
  if (kind === "question" && replay.answer) {
    const answered = { answer: replay.answer, verdict: replay.verdict };
    return { ...snapshot, answeredQuestions: { ...snapshot.answeredQuestions, [id]: answered } };
  }
  const recorded = { payloadDigest: replay.payloadDigest ?? "", verdict: replay.verdict };
  return { ...snapshot, recordedResults: { ...snapshot.recordedResults, [id]: recorded } };
}

const withHalt = (snapshot: Snapshot, record: JournalRecord): Snapshot =>
  record.halt ? { ...snapshot, halt: record.halt } : snapshot;

const FOLDS: Record<string, (snapshot: Snapshot, record: JournalRecord) => Snapshot> = {
  "work-order-issued": foldIssued,
  "plan-accepted": foldRouted,
  "unsettled-material-input": foldRouted,
  "question-opened": foldQuestion,
  "authorization-recorded": foldAuthorization,
  "accept-nonfinal-result": foldAccepted,
  "scope-or-obligation-revision": foldAccepted,
  "binding-recorded": foldBinding,
  "unrun-or-unresolved-dependency": withHalt,
  "missing-capability": withHalt,
  "reconciled-with-blocker": withHalt,
  "retry-scheduled": (snapshot, record) => ({
    ...snapshot,
    ...(record.workOrder ? { outstandingWorkOrder: record.workOrder } : {}),
    delegationRetries: (snapshot.delegationRetries ?? 0) + 1,
  }),
  "blocker-cleared-and-revalidated": (snapshot, record) => {
    const { halt: _cleared, ...rest } = snapshot;
    const adjustments = record.adjustments ?? [];
    return adjustments.length > 0
      ? { ...rest, startAdjustments: [...(snapshot.startAdjustments ?? []), ...adjustments] }
      : rest;
  },
};

function created(record: JournalRecord): Snapshot {
  const context = record.executionContext;
  return {
    run: { id: context?.runId ?? "", state: record.to ?? "created", sequence: record.sequence },
    ...(context ? { executionContext: context } : {}),
    ...record.start,
  };
}

// One event applied to the snapshot before it. The state is the one the event file records.
export function foldRecord(snapshot: Snapshot | null, record: JournalRecord): Snapshot {
  if (!snapshot) return created(record);
  const run = {
    ...snapshot.run,
    state: record.to ?? snapshot.run.state,
    sequence: record.sequence,
  };
  const fold = FOLDS[record.event];
  const folded = fold ? fold({ ...snapshot, run }, record) : { ...snapshot, run };
  return record.replay ? foldReplay(folded, record.replay) : folded;
}

// The state each transition event enters; an event not listed changes no state.
const STATE_AFTER_EVENT: Record<string, string> = {
  "run-created": "created",
  "capture-request": "routing",
  "plan-accepted": "ready",
  "unsettled-material-input": "awaiting_input",
  "missing-capability": "blocked",
  "dispatch-work-order": "running",
  "material-decision": "awaiting_input",
  "required-plan-revision": "routing",
  "validated-final-result-and-target": "completed",
  "accept-nonfinal-result": "ready",
  "unrun-or-unresolved-dependency": "blocked",
  "observed-session-interruption": "interrupted",
  "scope-or-obligation-revision": "routing",
  "valid-answer-no-replan": "ready",
  "answer-changes-scope": "routing",
  "blocker-cleared-and-revalidated": "ready",
  "reconciled-resume": "ready",
  "reconciled-with-blocker": "blocked",
  "authorized-stop": "cancelled",
};

// The journal records of one decision, numbered from the run's sequence before it. The last
// record enters the state the verdict reports and carries what a replay returns.
export function recordsOf(
  decision: WorkflowDecision,
  context: { operation: string; before: { state: string; sequence: number } | null },
  extras: (event: WorkflowEvent) => Partial<JournalRecord> = () => ({}),
  replay?: Omit<WorkflowReplay, "verdict">,
): Omit<JournalRecord, "prevHash">[] {
  const recordedAt = new Date().toISOString();
  let state = context.before?.state;
  const records = decision.events.map((event, index) => {
    const { type, ...fields } = event;
    const to = STATE_AFTER_EVENT[type];
    const record = {
      ...fields,
      ...extras(event),
      sequence: (context.before?.sequence ?? 0) + index + 1,
      event: type,
      operation: context.operation,
      recordedAt,
      ...(to ? { ...(state ? { from: state } : {}), to } : {}),
    };
    state = to ?? state;
    return record;
  });
  const last = records.at(-1);
  const final = decision.verdict.run?.state;
  if (last && final && final !== state) Object.assign(last, { from: state, to: final });
  if (last && replay) Object.assign(last, { replay: { ...replay, verdict: decision.verdict } });
  return records;
}

export const TRACKED_DIR = path.join(".qfai", "evidence", "workflow");

const ACCEPTED_OUTCOMES = ["accepted", "accepted_with_debt"];
const ACCEPTED_EVENTS = ["accept-nonfinal-result", "scope-or-obligation-revision"];

// Tracked evidence begins at the run's first `proceed` authorization or its first result accepted
// as `accepted` or `accepted_with_debt`. A run that ends before either tracks nothing.
function trackingBegun(records: readonly JournalRecord[]): boolean {
  return records.some(
    (record) =>
      (record.event === "authorization-recorded" && record.authorization?.effect === "proceed") ||
      (ACCEPTED_EVENTS.includes(record.event) && ACCEPTED_OUTCOMES.includes(record.outcome ?? "")),
  );
}

// The tracked summary, from the journal: IDs, digests and outcomes, never request text, an
// answer or anything the run settled.
// SIMPLIFIED: a stage's receipt digests are those of its report copies.
// Lift when: the core writes each accepted result under `results/` and digests it.
function summaryOf(records: readonly JournalRecord[], snapshot: WorkflowSnapshot) {
  const accepted = snapshot.acceptedStages ?? [];
  return {
    runId: snapshot.run.id,
    qfaiVersion: snapshot.executionContext?.qfaiVersion ?? "",
    route: snapshot.plan?.route ?? null,
    completionTarget: snapshot.completionTarget ?? "qfai_done",
    state: snapshot.run.state,
    targetBindings: records.flatMap((record) =>
      record.event === "binding-recorded" && record.binding ? [record.binding] : [],
    ),
    stages: accepted.map((stage) => ({
      stageInstanceId: stage.stageInstanceId,
      stageKind: stage.stageKind,
      outcome: stage.outcome,
      testObservation: stage.testObservation ?? "not_applicable",
      receiptDigests: (stage.reports ?? []).map((report) => report.digest),
      reviewerRoles: (stage.reviewResults ?? [])
        .filter((review) => review.verdict === "PASS")
        .map((review) => review.role),
    })),
    authorizationIds: (snapshot.authorizations ?? []).map((each) => each.authorizationId),
    debts: accepted.flatMap((stage) => stage.debts ?? []),
    requestDigest: snapshot.executionContext?.requestDigest ?? "",
    createdAt: records[0]?.recordedAt ?? "",
  };
}

function parseObject(bytes: Buffer): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(bytes.toString("utf8"));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function writeNew(file: string, content: string): Promise<IoRefusal | undefined> {
  const exists = await readFile(file).then(
    () => true,
    () => false,
  );
  return exists ? undefined : writeRecord(file, content);
}

// Rewrites the tracked summary when the journal says something it does not, and writes each
// authorization record once. The record itself is never rewritten.
export async function writeTracked(
  trackedDir: string,
  records: readonly JournalRecord[],
  snapshot: WorkflowSnapshot,
): Promise<IoRefusal | undefined> {
  if (!trackingBegun(records)) return undefined;
  await mkdir(path.join(trackedDir, "authorizations"), { recursive: true });
  for (const record of records) {
    const authorization = record.authorization;
    if (record.event !== "authorization-recorded" || !authorization) continue;
    const file = path.join(trackedDir, "authorizations", `${authorization.authorizationId}.json`);
    const refused = await writeNew(file, `${JSON.stringify(authorization, null, 2)}\n`);
    if (refused) return refused;
  }
  const summary = summaryOf(records, snapshot);
  const file = path.join(trackedDir, "summary.json");
  const existing = parseObject(await readFile(file).catch(() => Buffer.from("")));
  const { updatedAt: _written, ...kept } = existing ?? { updatedAt: "" };
  if (JSON.stringify(kept) === JSON.stringify(summary)) return undefined;
  const content = { ...summary, updatedAt: new Date().toISOString() };
  return writeRecord(file, `${JSON.stringify(content, null, 2)}\n`);
}
