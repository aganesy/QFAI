/**
 * A feature run on a `qfai init` project, driven the way `qfai-run` drives one: the routing
 * result names one new story in a new business flow, the operator approves it, and each stage
 * writes what its skill would write before its result is submitted. The story-authoring stage
 * asks for the change first, and the attempt holding the answer writes the story tree and the
 * two `decisions.md` rows that cite it.
 */
import {
  acceptThenNext,
  answer,
  authorizationsOf,
  commitAll,
  field,
  fileRef,
  list,
  routedRun,
  START_INPUT,
  submit,
  resultFor,
  workflow,
  write,
} from "./workflowJourney.js";

export const FLOW_ID = "BF-0001";
export const STORY_ID = "US-0001-0001";
export const CRITERION_ID = "AC-0001-0001-01";
export const EXAMPLE_IDS = ["EX-0001-0001-01", "EX-0001-0001-02"];

const SPEC = ".qfai/spec";
const FLOW_DIR = `${SPEC}/02_business-flow/business-flow-0001`;
const STORY_DIR = `${FLOW_DIR}/user-story-0001-0001`;
export const DECISIONS = `${SPEC}/decisions.md`;
const CONTRACT = `${SPEC}/03_contract/cli/notification-addresses.md`;

export const E2E_TEST = "tests/e2e/notification-addresses.test.ts";
export const INTEGRATION_TEST = "tests/integration/notification-addresses.test.ts";
export const UNIT_TEST = "tests/unit/notification-addresses.test.ts";
export const PRODUCTION_FILE = "src/notification-addresses.ts";
export const SEAM_TEST = "notification addresses: a sixth address is refused";

// The acceptance stage's own records for the flow.
const ATDD_EVIDENCE = ".qfai/evidence/atdd-BF-0001.md";
const COVERAGE_MATRIX = ".qfai/evidence/coverage-depth-BF-0001.md";

/** The routing proposal: one new story that creates its business flow. */
export const FEATURE_PROPOSAL = {
  requestKind: "change",
  candidateRoute: "feature",
  goal: "Let each customer register up to five notification addresses.",
  expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
  observedRefs: [],
  affectedFlowIds: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [
    {
      goal: "Register notification addresses",
      covers: ["up to five addresses per customer", "no duplicate address"],
      excludes: ["sending the notifications"],
      evidence: ["The story tree declares no business flow."],
      flowId: null,
    },
  ],
  proposedWriteScope: [
    `${SPEC}/02_business-flow/**`,
    `${SPEC}/03_contract/**`,
    "src/**",
    "tests/**",
  ],
  protectedTargets: [],
  requiredStages: ["sdd", "acceptance", "implement", "verify"],
  rationale: "A new capability that no story represents.",
};

/** The one question the story-authoring stage asks before it changes the story tree. */
export const CHANGE_QUESTION = {
  kind: "decision",
  text: "Write the new business flow, its story and the contract rule that enforces it?",
  options: [
    {
      optionId: "apply",
      label: "Write them",
      description: "The stage writes the flow, the story and the rule.",
      effect: "proceed",
    },
    {
      optionId: "skip",
      label: "Leave the story tree",
      description: "The run stops.",
      effect: "stop",
    },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "apply",
};

const CONTRACTS_INDEX = [
  "# Contracts",
  "",
  "## Contract Index",
  "",
  "| Short ID | Entity | Declared ID | File | Depends On | Reconciled With | Purpose |",
  "| -------- | ------ | ----------- | ---- | ---------- | --------------- | ------- |",
  `| CLI-NOTIFY | Notification addresses | - | \`${CONTRACT}\` | - | - | Where notifications go |`,
  "",
].join("\n");

// The story tree the story-authoring stage writes for the approved slot.
const STORY_TREE: Record<string, string> = {
  [`${SPEC}/02_business-flow/business-flows.md`]: [
    "# Business Flows",
    "",
    "## Flows",
    "",
    "| BF-ID | Flow | Path |",
    "| ----- | ---- | ---- |",
    "| BF-0001 | Notify customers | `business-flow-0001/` |",
    "",
  ].join("\n"),
  [`${FLOW_DIR}/business-flow.md`]: [
    "# BF-0001: Notify customers",
    "",
    "## Purpose",
    "",
    "- A customer chooses where notifications go.",
    "",
    "## Flow",
    "",
    "```mermaid",
    "flowchart LR",
    "  Register --> Notify",
    "```",
    "",
  ].join("\n"),
  [`${FLOW_DIR}/user-stories.md`]: [
    "# User Stories",
    "",
    "## Stories",
    "",
    "| US-ID | Story | Path |",
    "| ----- | ----- | ---- |",
    "| US-0001-0001 | Register notification addresses | `user-story-0001-0001/` |",
    "",
  ].join("\n"),
  [`${STORY_DIR}/01_User-story.md`]: [
    "# US-0001-0001: Register notification addresses",
    "",
    "## User Story",
    "",
    "- Goal: As a customer, I register up to five notification addresses.",
    "",
  ].join("\n"),
  [`${STORY_DIR}/02_Acceptance-Criteria.md`]: [
    "# Acceptance Criteria",
    "",
    "## Criteria",
    "",
    "```gherkin",
    "Feature: Register notification addresses",
    "  # AC-0001-0001-01",
    "  Scenario: A customer keeps at most five distinct addresses",
    "    Given a customer with five notification addresses",
    "    When the customer adds another address",
    "    Then the address is refused",
    "```",
    "",
  ].join("\n"),
  [`${STORY_DIR}/03_Example.md`]: [
    "# Examples",
    "",
    "## Examples",
    "",
    "| EX-ID | AC-Ref | Input | Expected |",
    "| ----- | ------ | ----- | -------- |",
    "| EX-0001-0001-01 | AC-0001-0001-01 | A sixth address | Refused |",
    "| EX-0001-0001-02 | AC-0001-0001-01 | An address already registered | Refused |",
    "",
  ].join("\n"),
  [CONTRACT]: [
    "# CLI Contract: notification addresses",
    "",
    "## Behavior",
    "",
    "- A customer registers notification addresses.",
    "",
    "## Rules",
    "",
    "| BR-ID | Statement | Examples |",
    "| ----- | --------- | -------- |",
    "| BR-0001 | A customer holds at most five addresses, each once | EX-0001-0001-01, EX-0001-0001-02 |",
    "",
  ].join("\n"),
  [`${SPEC}/03_contract/contracts.md`]: CONTRACTS_INDEX,
};

/** The story-tree and contract files the story-authoring stage writes. */
export const STORY_FILES = Object.keys(STORY_TREE);

// The citation a `decisions.md` row carries for an answer this run recorded.
const cites = (runId: string, record: unknown) =>
  `Answered ${runId}/${String(field(record, "authorizationId"))} by ${String(field(record, "answeredBy"))}`;

function decisionsTable(rows: string[]): string {
  return ["# Decisions", "", "## Decisions", "", "| ID | Content | Approach | Status |"]
    .concat("| --- | ------- | -------- | ------ |", rows, "")
    .join("\n");
}

/** The authorization record that answered the question `questionId`. */
export async function recordFor(root: string, runId: string, questionId: unknown) {
  const records = await authorizationsOf(root, runId);
  return records.find((record) => field(record, "questionId") === questionId);
}

/** The run routed with the feature proposal, its create question answered `proceed`. */
export async function approvedFeature(root: string, input: unknown = START_INPUT) {
  const { runId, routed } = await routedRun(root, FEATURE_PROPOSAL, input);
  const create = list(routed.json, "questions")[0];
  const waiting = workflow(root, ["next", "--run", runId]);
  const approved = await answer(root, runId, create, "proceed");
  return {
    runId,
    routed,
    create,
    waiting,
    approved,
    sdd: workflow(root, ["next", "--run", runId]),
  };
}

/**
 * The story-authoring stage: the first attempt asks for the change and changes nothing; the
 * attempt holding the answer writes the story tree, appends the CREATE row and the change
 * request, each citing its answer and at DONE once every change it names is written, and binds
 * the slot.
 */
export async function authorStory(root: string, runId: string, sdd: unknown, createId: unknown) {
  const asked = await submit(root, runId, "accept", {
    ...resultFor(sdd, "sdd-ask"),
    outcome: "awaiting_input",
    questions: [CHANGE_QUESTION],
  });
  const change = list(workflow(root, ["status", "--run", runId]).json, "questions")[0];
  const answered = await answer(root, runId, change, "proceed");
  const again = workflow(root, ["next", "--run", runId]);
  for (const [rel, text] of Object.entries(STORY_TREE)) await write(root, rel, text);
  const create = await recordFor(root, runId, createId);
  const approval = await recordFor(root, runId, field(change, "questionId"));
  await write(
    root,
    DECISIONS,
    decisionsTable([
      `| DEC-0001 | CREATE ${FLOW_ID} and ${STORY_ID} | ${cites(runId, create)} | DONE |`,
      `| DEC-0002 | Change request: ${[...STORY_FILES, DECISIONS].join(", ")} | ${cites(runId, approval)} | DONE |`,
    ]),
  );
  const changedFiles = await Promise.all(
    [...STORY_FILES, DECISIONS].map((rel) => fileRef(root, rel)),
  );
  const slotId = field(again.json, "workOrder.target.slotId");
  const bindings = [{ slotId, flowId: FLOW_ID, storyIds: [STORY_ID] }];
  const written = await acceptThenNext(root, runId, again.json, "sdd-write", {
    changedFiles,
    bindings,
  });
  return { asked, change, answered, again, create, approval, ...written };
}

const E2E_TEXT = `// QFAI:${FLOW_ID}\nit("${SEAM_TEST}", () => expect(add(five, "f@example.com")).toBe(false));\n`;
const INTEGRATION_TEXT = `// QFAI:${CRITERION_ID}\nit("keeps five distinct addresses", () => expect(add(five, "a@example.com")).toBe(false));\n`;
const UNIT_TEXT = EXAMPLE_IDS.map(
  (id) => `// QFAI:${id}\nit("${id}", () => expect(add(five, "a@example.com")).toBe(false));\n`,
).join("\n");

const n = "n/a | n/a | n/a | n/a | n/a";
const COVERAGE_TEXT = [
  "# Coverage Depth Matrix: BF-0001",
  "",
  "The E2E obligation of BF-0001 is [its E2E test](../../tests/e2e/notification-addresses.test.ts).",
  "",
  "| ID | Layer | Oracle and test | Normal | Error | Boundary | Special | State transition | Combinatorial |",
  "| --- | ----- | --------------- | ------ | ----- | -------- | ------- | ---------------- | ------------- |",
  `| US-0001-0001 | E2E | ${E2E_TEST} | ✅ | ${n} |`,
  `| AC-0001-0001-01 | Integration | ${INTEGRATION_TEST} | ✅ | ${n} |`,
  ...EXAMPLE_IDS.map((id) => `| ${id} | Unit | ${UNIT_TEST} | ✅ | ${n} |`),
  "",
].join("\n");
const ATDD_TEXT = [
  "# ATDD evidence: BF-0001",
  "",
  "## Coverage Depth Matrix",
  "",
  "- Matrix: `coverage-depth-BF-0001.md`",
  "- ✅ 4 / ⚠ 0 / ❌ 0",
  "",
].join("\n");

/**
 * Acceptance with its seam round trip, up to the implement work order. A prototype stage the
 * plan issues is recorded as not applicable: no UI contract serves the flow.
 */
export async function throughAcceptance(root: string, runId: string, afterSdd: unknown) {
  let acceptance: unknown = afterSdd;
  let prototype: unknown;
  if (field(afterSdd, "workOrder.stageKind") === "prototype") {
    prototype = afterSdd;
    const notRun = { kind: "not_applicable", reason: "No UI contract serves the flow." };
    acceptance = (await acceptThenNext(root, runId, afterSdd, "prototype-1", { notRun })).next.json;
  }
  await write(root, E2E_TEST, E2E_TEXT);
  await write(root, INTEGRATION_TEST, INTEGRATION_TEXT);
  await write(root, COVERAGE_MATRIX, COVERAGE_TEXT);
  await write(root, ATDD_EVIDENCE, ATDD_TEXT);
  const tests = await Promise.all(
    [E2E_TEST, INTEGRATION_TEST, COVERAGE_MATRIX, ATDD_EVIDENCE].map((rel) => fileRef(root, rel)),
  );
  const { next: seam } = await acceptThenNext(root, runId, acceptance, "acceptance-1", {
    outcome: "needs_repair",
    changedFiles: tests,
    seamRequest: { targetTestId: SEAM_TEST },
  });
  await write(root, PRODUCTION_FILE, "export const add = () => { throw new Error('501'); };\n");
  const { next: again } = await acceptThenNext(root, runId, seam.json, "seam-1", {
    testObservation: "fail",
    changedFiles: [await fileRef(root, PRODUCTION_FILE)],
    seam: { targetTestId: SEAM_TEST, observation: "fail" },
  });
  const { next: implement } = await acceptThenNext(root, runId, again.json, "acceptance-2", {
    testObservation: "expected_red",
    red: { testId: SEAM_TEST, failureKind: "assertion" },
  });
  return { prototype, acceptance, seam: seam.json, again: again.json, implement: implement.json };
}

/** The implement stage: the production code and one test per example, GREEN. */
export async function implementGreen(root: string, runId: string, implement: unknown) {
  await write(
    root,
    PRODUCTION_FILE,
    "export const add = (known: string[], address: string) =>\n  known.length < 5 && !known.includes(address);\n",
  );
  await write(root, UNIT_TEST, UNIT_TEXT);
  const changedFiles = await Promise.all(
    [PRODUCTION_FILE, UNIT_TEST].map((rel) => fileRef(root, rel)),
  );
  return acceptThenNext(root, runId, implement, "implement-1", {
    testObservation: "pass",
    changedFiles,
  });
}

/**
 * A project that already holds the flow this run would create, with a test annotating each of
 * its obligations, committed: the tree a change to existing behaviour starts from.
 */
export async function seedFlow(root: string): Promise<void> {
  for (const [rel, text] of Object.entries(STORY_TREE)) await write(root, rel, text);
  await write(root, E2E_TEST, E2E_TEXT);
  await write(root, INTEGRATION_TEST, INTEGRATION_TEXT);
  await write(root, UNIT_TEST, UNIT_TEXT);
  await write(
    root,
    PRODUCTION_FILE,
    "export const add = (known: string[], address: string) =>\n  known.length < 5 && !known.includes(address);\n",
  );
  commitAll(root);
}

/** The verify stage: this run's full PASS report and an independent QA pass. */
export async function verifyPass(root: string, runId: string, verify: unknown) {
  await write(root, ".qfai/report/verify.json", '{"status":"PASS","scope":"full"}\n');
  return acceptThenNext(root, runId, verify, "verify-1", {
    testObservation: "pass",
    artifactRefs: [await fileRef(root, ".qfai/report/verify.json")],
    reviewResults: [
      { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: "qa.md" },
    ],
  });
}
