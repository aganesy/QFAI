// QFAI:EX-0001-0192-46
// QFAI:EX-0001-0192-47
// QFAI:EX-0001-0192-50
// QFAI:EX-0001-0195-13
// QFAI:EX-0001-0195-14

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { JournalRun, planOf, readyWith, stage } from "./journalRun.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;

const RUN = "run-20260926000000000";
const STORY = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0005";
const CONTRACT = ".qfai/spec/03_contract/cli/notify.md";
const DECISIONS = ".qfai/spec/decisions.md";
const CREATE = { authorizationId: "authorization-4", operation: "CREATE" };
const CHANGE = { authorizationId: "authorization-9", operation: "CHANGE_REQUEST" };

function table(rows: string[]): string {
  return ["# Decisions", "", "| ID | Content | Approach | Status |", "| --- | --- | --- | --- |"]
    .concat(rows)
    .join("\n");
}

const QUESTIONS = table(["| OQ-0001 | Which channel? | Ask the owner | TODO |"]);
const AT_ISSUE = ["EX-0001-0005-01", "EX-0001-0005-02"];
const ISSUED = [
  "| DEC-0001 | CREATE US-0001-0004 in BF-0001 | Approved by the owner | DONE |",
  "| DEC-0002 | Keep one email per customer | Settled in discussion | DONE |",
];

// A row citing an answer this run recorded, and the operator who gave it.
const cites = (answer: { authorizationId: string }) =>
  `Answered ${RUN}/${answer.authorizationId} by operator-1`;

function contract(examples: string, statement = "One email per customer"): string {
  return [
    "# Notify",
    "",
    "## Rules",
    "",
    "| BR-ID | Statement | Examples |",
    "| --- | --- | --- |",
    `| BR-0001 | ${statement} | ${examples} |`,
    "| BR-0002 | Emails are unique | EX-0001-0005-02 |",
    "",
  ].join("\n");
}

interface Accepted {
  stageKind: string;
  after: string[];
  changed?: string[];
  outcome?: string;
  appendedByRun?: string[];
  contractAfter?: string;
}

// A story-authoring work order issued against `ISSUED`, and its result accepted against `after`.
function accept(accepted: Accepted) {
  const { stageKind, after, changed = [], outcome = "accepted" } = accepted;
  const stage = {
    stageInstanceId: stageKind,
    stageKind,
    skill: "qfai-sdd",
    operation: "op",
    when: "always",
  };
  const workOrder = {
    workOrderId: `work-order-${stageKind}-1`,
    stageInstanceId: stageKind,
    attempt: 1,
    stageKind,
    target: { kind: "flow" as const, flowId: "BF-0001" },
    executor: { skill: "qfai-sdd" },
    operation: "op",
    scope: { writeAreas: [".qfai/spec/02_business-flow/**"] },
    recordAreas: [DECISIONS, ".qfai/spec/open-questions.md", CONTRACT],
  };
  const answers = [CREATE, CHANGE].map((each) => ({
    ...each,
    kind: "human_decision",
    answeredBy: "operator-1",
  }));
  const snapshot: Snapshot = {
    run: { id: RUN, state: "running", sequence: 12 },
    plan: { route: "bounded-change", stages: [stage] },
    flowBinding: { flowId: "BF-0001" },
    outstandingWorkOrder: workOrder,
    authorizations: [...answers, { authorizationId: "authorization-2", kind: "request_scope" }],
    issuedRecords: {
      decisions: table(ISSUED),
      openQuestions: QUESTIONS,
      contract: { path: CONTRACT, text: contract("EX-0001-0005-01") },
    },
    ...(accepted.appendedByRun ? { appendedRows: accepted.appendedByRun } : {}),
    issuedObligations: { flowId: "BF-0001", exampleIds: AT_ISSUE, annotated: [] },
  };
  const records = {
    decisions: table(after),
    openQuestions: QUESTIONS,
    contract: { path: CONTRACT, text: accepted.contractAfter ?? contract("EX-0001-0005-01") },
  };
  const result = {
    resultId: `result-${stageKind}`,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: 1,
    expectedSequence: 12,
    outcome,
    changedFiles: changed.map((path) => ({ path, digest: "d".repeat(64) })),
    ...(outcome === "awaiting_input" ? { questions: [changeQuestion] } : {}),
  };
  // Seeding adds EX-0001-0005-03 to the story; every other stage leaves the examples as issued.
  const exampleIds = stageKind === "sdd_append" ? [...AT_ISSUE, "EX-0001-0005-03"] : AT_ISSUE;
  const obligations = { flowId: "BF-0001", ids: [], exampleIds, annotated: [], digest: "" };
  const decision = decide(snapshot, { operation: "accept", result }, { records, obligations });
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : undefined,
  };
}

const changeQuestion = {
  kind: "decision",
  text: "Add the empty-value example to user-story-0001-0005 and cite it from BR-0001?",
  options: [
    {
      optionId: "apply",
      label: "Apply it",
      description: "The stage writes both.",
      effect: "proceed",
    },
    { optionId: "skip", label: "Leave it", description: "The run stops.", effect: "stop" },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "apply",
};

const accepted = { state: "ready", reasons: undefined };
const refused = (reason: string, subject: string) => ({
  state: "running",
  reasons: [{ reason, subject }],
});

const NEW_STORY = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0006";
const storyFiles = [`${NEW_STORY}/01_User-story.md`, `${NEW_STORY}/03_Example.md`];

it("An sdd result appending a cited CREATE row and a cited change request, each at WIP", () => {
  expect(
    accept({
      stageKind: "sdd",
      changed: storyFiles,
      after: [
        ...ISSUED,
        `| DEC-0003 | CREATE US-0001-0006 in BF-0001 | ${cites(CREATE)} | WIP |`,
        `| DEC-0004 | Change request: ${storyFiles.join(", ")} | ${cites(CHANGE)} | WIP |`,
      ],
    }),
  ).toEqual(accepted);
});

it("An sdd_delta result editing the Content of a row present at issue", () => {
  expect(
    accept({
      stageKind: "sdd_delta",
      after: [
        ISSUED[0] ?? "",
        "| DEC-0002 | Keep two emails per customer | Settled in discussion | DONE |",
      ],
    }),
  ).toEqual(refused("record-rewritten", "DEC-0002"));
});

it("An sdd_delta result moving the Status of a row this run did not append", () => {
  expect(
    accept({
      stageKind: "sdd_delta",
      after: [
        ISSUED[0] ?? "",
        "| DEC-0002 | Keep one email per customer | Settled in discussion | WIP |",
      ],
    }),
  ).toEqual(refused("record-rewritten", "DEC-0002"));
});

it("An sdd_delta result moving the Status of a row this run appended", () => {
  expect(
    accept({
      stageKind: "sdd_delta",
      appendedByRun: ["DEC-0002"],
      after: [
        ISSUED[0] ?? "",
        "| DEC-0002 | Keep one email per customer | Settled in discussion | WIP |",
      ],
    }),
  ).toEqual(accepted);
});

it("An appended CREATE row at WIP citing no human_decision of this run", () => {
  expect(
    accept({
      stageKind: "sdd_delta",
      after: [...ISSUED, "| DEC-0003 | CREATE US-0001-0006 in BF-0001 | Approved | WIP |"],
    }),
  ).toEqual(refused("record-unauthorized", "DEC-0003"));
});

it("An sdd result whose change request cites only the run's request_scope", () => {
  expect(
    accept({
      stageKind: "sdd",
      changed: storyFiles,
      after: [
        ...ISSUED,
        `| DEC-0003 | CREATE US-0001-0006 in BF-0001 | ${cites(CREATE)} | WIP |`,
        `| DEC-0004 | Change request: ${storyFiles.join(", ")} | ${RUN}/authorization-2 | WIP |`,
      ],
    }),
  ).toEqual({
    state: "running",
    reasons: [
      { reason: "record-unauthorized", subject: "DEC-0004" },
      ...storyFiles.map((subject) => ({ reason: "record-unauthorized", subject })),
    ],
  });
});

const example = `${STORY}/03_Example.md`;
const seeded = "EX-0001-0005-01, EX-0001-0005-03";

it("Seeding asks first: a first result that already wrote the example", () => {
  expect(
    accept({
      stageKind: "sdd_append",
      outcome: "awaiting_input",
      changed: [example],
      after: ISSUED,
    }),
  ).toEqual(refused("record-unauthorized", example));
});

it("Seeding asks first: a first result that changed nothing", () => {
  expect(accept({ stageKind: "sdd_append", outcome: "awaiting_input", after: ISSUED }).state).toBe(
    "awaiting_input",
  );
});

it("Seeding after the answer writes the example and its citation under a change request", () => {
  expect(
    accept({
      stageKind: "sdd_append",
      changed: [example, CONTRACT],
      contractAfter: contract(seeded),
      after: [
        ...ISSUED,
        `| DEC-0003 | UPDATE:APPEND EX-0001-0005-03 to US-0001-0005 | From the diagnosis | DONE |`,
        `| DEC-0004 | Change request: ${example}, ${CONTRACT} | ${cites(CHANGE)} | WIP |`,
      ],
    }),
  ).toEqual(accepted);
});

const withChangeRequest = [
  ...ISSUED,
  `| DEC-0003 | Change request: ${example}, ${CONTRACT} | ${cites(CHANGE)} | WIP |`,
];

it("Seeding that also rewords the rule's Statement", () => {
  expect(
    accept({
      stageKind: "sdd_append",
      changed: [example, CONTRACT],
      contractAfter: contract(seeded, "One email for each customer"),
      after: withChangeRequest,
    }),
  ).toEqual(refused("rule-changed", CONTRACT));
});

it("Seeding that cites the new example from two rules", () => {
  const twice = contract(seeded).replace(
    "| BR-0002 | Emails are unique | EX-0001-0005-02 |",
    "| BR-0002 | Emails are unique | EX-0001-0005-02, EX-0001-0005-03 |",
  );

  expect(
    accept({
      stageKind: "sdd_append",
      changed: [example, CONTRACT],
      contractAfter: twice,
      after: withChangeRequest,
    }),
  ).toEqual(refused("rule-changed", CONTRACT));
});

it("The answer to a story-authoring stage's question authorizes its change", () => {
  const run = { id: RUN, state: "awaiting_input", sequence: 14 };
  // The question the stage's first result opened, as the core stored it.
  const open = {
    questionId: "question-13-1",
    kind: "decision" as const,
    text: changeQuestion.text,
    options: [
      {
        optionId: "apply",
        label: "Apply it",
        description: "Writes both.",
        effect: "proceed" as const,
      },
      {
        optionId: "skip",
        label: "Leave it",
        description: "The run stops.",
        effect: "stop" as const,
      },
    ],
    selection: { min: 1, max: 1 },
    recommendation: "apply",
    changeRequest: true as const,
  };
  const answered = decide(
    { run, openQuestions: [open], scopeDigest: "a".repeat(64) },
    {
      operation: "decision",
      questionId: "question-13-1",
      answer: { optionIds: ["apply"] },
      answeredBy: "operator-1",
      expectedSequence: 14,
    },
    { now: "2026-09-26T00:00:00.000Z" },
  );
  const authorization = answered.events.find((event) => event.authorization)?.authorization;

  expect({
    state: answered.verdict.run?.state,
    operation: authorization?.operation,
    answeredBy: authorization?.answeredBy,
  }).toEqual({ state: "ready", operation: "CHANGE_REQUEST", answeredBy: "operator-1" });
});

// A bounded run's sdd_delta stage, driven through the journal: its first attempt appends a row
// and ends with `outcome`, and the attempt after it moves that row to DONE.
function laterAttemptMovesItsRow(outcome: "needs_repair" | "blocked") {
  const plan = planOf(
    "bounded-change",
    [
      stage("bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"),
      stage("bounded-implement", "implement", "qfai-implement", "implement"),
      stage("bounded-verify", "verify", "qfai-verify", "verify-full"),
    ],
    [".qfai/spec/02_business-flow/business-flow-0001/**"],
  );
  const facts = (rows: string[]) => ({
    flows: ["BF-0001"],
    records: { decisions: table(rows), openQuestions: QUESTIONS },
    obligations: {
      flowId: "BF-0001",
      ids: ["BF-0001"],
      exampleIds: [],
      annotated: [],
      digest: "1".repeat(64),
    },
  });
  const settled = "| DEC-0003 | Keep the retry count at three | Settled in review |";
  const finding = {
    findingCode: "QFAI-TRACE-002",
    path: outcome === "blocked" ? "docs/notes.md" : `${STORY}/03_Example.md`,
    cause: "The example names a criterion the story does not define",
    owningFlow: "BF-0001",
    detectingCommand: "qfai validate",
    resolvingOwner: outcome === "blocked" ? "operator" : "qfai-sdd",
    blockingExtent: "run",
  };
  const run = new JournalRun(readyWith(plan, "BF-0001"));
  run.next(facts(ISSUED));
  run.accept({ outcome, debts: [finding] }, facts([...ISSUED, `${settled} WIP |`]));
  if (outcome === "blocked")
    run.apply({ operation: "resume" }, facts([...ISSUED, `${settled} WIP |`]));
  else run.next(facts([...ISSUED, `${settled} WIP |`]));
  const decision = run.accept({}, facts([...ISSUED, `${settled} DONE |`]));
  const error = decision.verdict.error;
  return {
    appended: run.snapshot.appendedRows,
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : undefined,
  };
}

it("A later attempt moves the row its needs_repair attempt appended from WIP to DONE", () => {
  expect(laterAttemptMovesItsRow("needs_repair")).toEqual({
    appended: ["DEC-0003"],
    state: "ready",
    reasons: undefined,
  });
});

it("A later attempt moves the row its blocked attempt appended from WIP to DONE", () => {
  expect(laterAttemptMovesItsRow("blocked")).toEqual({
    appended: ["DEC-0003"],
    state: "ready",
    reasons: undefined,
  });
});
