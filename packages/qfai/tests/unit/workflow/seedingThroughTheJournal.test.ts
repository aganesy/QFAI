// QFAI:EX-0001-0192-50
// QFAI:EX-0001-0193-05
// QFAI:EX-0001-0195-13

import { expect, it } from "vitest";

import { JournalRun, planOf, readyWith, stage } from "./journalRun.js";

const FLOW = "BF-0001";
const RUN = "run-20260926000000000";
const STORY = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0005";
const EXAMPLE = `${STORY}/03_Example.md`;
const CONTRACT = ".qfai/spec/03_contract/cli/notify.md";

function table(rows: string[]): string {
  return ["# Decisions", "", "| ID | Content | Approach | Status |", "| --- | --- | --- | --- |"]
    .concat(rows)
    .join("\n");
}

function contract(first: string, second = "EX-0001-0005-02"): string {
  return [
    "# Notify",
    "",
    "## Rules",
    "",
    "| BR-ID | Statement | Examples |",
    "| --- | --- | --- |",
    `| BR-0001 | One email per customer | ${first} |`,
    `| BR-0002 | Emails are unique | ${second} |`,
    "",
  ].join("\n");
}

const obligations = (exampleIds: string[]) => ({
  flowId: FLOW,
  ids: [FLOW, ...exampleIds],
  exampleIds,
  annotated: [],
  digest: "1".repeat(64),
});

const ISSUED = ["| DEC-0001 | Keep one email per customer | Settled in discussion | DONE |"];
const AT_ISSUE = ["EX-0001-0005-01", "EX-0001-0005-02"];

function facts(rows: string[], text: string, exampleIds: string[]) {
  return {
    flows: [FLOW],
    obligations: obligations(exampleIds),
    seeding: { exampleFile: EXAMPLE, contractFiles: [CONTRACT] },
    records: {
      decisions: table(rows),
      openQuestions: table([]),
      contract: { path: CONTRACT, text },
    },
  };
}

const question = {
  kind: "decision",
  text: "Add the empty-value example and cite it from BR-0001?",
  options: [
    { optionId: "apply", label: "Apply it", description: "Writes both.", effect: "proceed" },
    { optionId: "skip", label: "Leave it", description: "The run stops.", effect: "stop" },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "apply",
};

// A bugfix run seeding an example: its first attempt asks the change question, the operator
// answers, and the second attempt is issued. Returns the run and the answer's authorization.
function answered(answeredBy: string) {
  const plan = planOf(
    "bugfix",
    [
      stage("diagnose", "diagnose", "qfai-implement", "diagnose-only"),
      stage(
        "sdd-append",
        "sdd_append",
        "qfai-sdd",
        "defect-example-seeding",
        "missing_example_needed",
      ),
      stage("verify", "verify", "qfai-verify", "verify-full"),
    ],
    [STORY],
  );
  const issue = facts(ISSUED, contract("EX-0001-0005-01"), AT_ISSUE);
  const run = new JournalRun(readyWith(plan, FLOW, RUN));
  run.next(issue);
  const diagnosis = {
    verdict: "missing-test",
    reproductionRef: ".qfai/evidence/repro.md",
    matchedIds: ["AC-0001-0005-01"],
  };
  run.accept({ diagnosis }, issue);
  expect(run.next(issue).stageKind).toBe("sdd_append");
  run.accept({ outcome: "awaiting_input", questions: [question] }, issue);
  const [open] = run.snapshot.openQuestions ?? [];
  run.apply(
    {
      operation: "decision",
      questionId: open?.questionId ?? "",
      answer: { optionIds: ["apply"] },
      answeredBy,
      expectedSequence: run.snapshot.run.sequence,
    },
    { now: "2026-09-26T00:00:00.000Z" },
  );
  const authorization = run.snapshot.authorizations?.at(-1)?.authorizationId ?? "";
  run.next(issue);
  return { run, authorization };
}

function reasonsOf(decision: ReturnType<JournalRun["accept"]>) {
  const error = decision.verdict.error;
  return error && "reasons" in error ? error.reasons : undefined;
}

// The second attempt: the new example written, the contract changed to `text`, and a change
// request row naming both files that cites the answer as `citation`.
function seeded(answeredBy: string, citation: (id: string) => string, text: string) {
  const { run, authorization } = answered(answeredBy);
  const row = `| DEC-0002 | Change request: ${EXAMPLE}, ${CONTRACT} | ${citation(authorization)} | DONE |`;
  const after = facts([...ISSUED, row], text, [...AT_ISSUE, "EX-0001-0005-03"]);
  const changed = [EXAMPLE, CONTRACT].map((path) => ({ path, digest: "d".repeat(64) }));
  return reasonsOf(run.accept({ changedFiles: changed }, after));
}

const withNewExample = contract("EX-0001-0005-01, EX-0001-0005-03");

it("A change request citing the answer and the operator who gave it", () => {
  expect(
    seeded("operator-1", (id) => `Answered ${RUN}/${id} by operator-1`, withNewExample),
  ).toBeUndefined();
});

it("A change request naming someone whose name only begins with the operator's", () => {
  expect(
    seeded("operator-1", (id) => `Answered ${RUN}/${id} by operator-12`, withNewExample),
  ).toEqual(expect.arrayContaining([{ reason: "record-unauthorized", subject: "DEC-0002" }]));
});

it("Seeding that cites, instead of the new example, an example the story already had", () => {
  const cited = contract("EX-0001-0005-01, EX-0001-0005-02");

  expect(seeded("operator-1", (id) => `Answered ${RUN}/${id} by operator-1`, cited)).toEqual([
    { reason: "rule-changed", subject: CONTRACT },
  ]);
});

it("An implement result accepted while the bound flow's obligations cannot be read", () => {
  const plan = planOf("bounded-change", [
    stage("bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"),
    stage("bounded-implement", "implement", "qfai-implement", "implement"),
    stage("bounded-verify", "verify", "qfai-verify", "verify-full"),
  ]);
  const read = { flows: [FLOW], obligations: obligations(AT_ISSUE) };
  const run = new JournalRun(readyWith(plan, FLOW, RUN));
  run.next(read);
  run.accept({}, read);
  run.next(read);

  expect(reasonsOf(run.accept({}, { flows: [FLOW] }))).toEqual([
    { reason: "example-uncovered", subject: FLOW },
  ]);
});
