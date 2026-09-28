// QFAI:AC-0001-0220-01
// QFAI:AC-0001-0220-02
// QFAI:AC-0001-0220-03
// QFAI:AC-0001-0220-04
// QFAI:AC-0001-0220-05
// QFAI:AC-0001-0221-05

import { expect, it } from "vitest";

import type { RoutingReading } from "../../../src/core/workflow/extraction.js";
import { answerOpen, quietCompletion, routedBy, runFacts } from "./decisionRuns.js";

const reading = (fields: Partial<RoutingReading>): RoutingReading => ({
  intent: "feature",
  entryFlags: [],
  qualifiers: [],
  signals: [],
  ...fields,
});

// The validator and the template disagree on a column name: a defect, or two surfaces at odds.
const UNSURE = {
  intent: "defect" as const,
  confidence: "low" as const,
  alternatives: [reading({ intent: "surface-contradiction" })],
};

const modifiersOf = (run: Awaited<ReturnType<typeof routedBy>>["run"]) =>
  (run.snapshot.modifiers ?? []).map((each) => each.modifier).sort();

// QFAI:EX-0001-0220-01
it("A low-confidence request asks one single-select question naming each candidate route", async () => {
  const { run, decision } = await routedBy(UNSURE);
  const [question] = decision.verdict.questions ?? [];
  const modifiers = modifiersOf(run);
  const answered = answerOpen(run, "route", "fix-defect");

  expect({
    state: decision.verdict.run?.state,
    kind: question?.kind,
    selection: question?.selection,
    options: question?.options.map((option) => option.optionId),
    labelled: question?.options.every((option) => option.label && option.description),
    recommendation: question?.recommendation,
    modifiers,
    answered: [answered.verdict.run?.state, run.snapshot.routeDecision, run.snapshot.plan?.route],
  }).toEqual({
    state: "awaiting_input",
    kind: "decision",
    selection: { min: 1, max: 1 },
    options: ["repair-consistency", "fix-defect"],
    labelled: true,
    recommendation: "fix-defect",
    modifiers: ["gate:user", "review:heavy"],
    answered: ["ready", { route: "fix-defect", rule: 27 }, "fix-defect"],
  });
});

// QFAI:EX-0001-0220-02
it("Candidates that differ in their gates ask at medium confidence and carry the user gate", async () => {
  const { run, decision } = await routedBy({
    intent: "feature",
    confidence: "medium",
    alternatives: [reading({ entryFlags: ["decision"] })],
  });

  expect({
    state: decision.verdict.run?.state,
    options: decision.verdict.questions?.[0]?.options.map((option) => option.optionId).sort(),
    modifiers: modifiersOf(run),
  }).toEqual({
    state: "awaiting_input",
    options: ["add-feature", "decide-acceptance"],
    modifiers: ["gate:user"],
  });
});

// QFAI:EX-0001-0220-03
it("A request that reads one way takes its route with no question and no added modifier", async () => {
  const high = await routedBy({ intent: "feature" });
  const medium = await routedBy({
    intent: "feature",
    confidence: "medium",
    alternatives: [reading({ intent: "feature" })],
  });

  expect(
    [high, medium].map(({ run, decision }) => [
      decision.verdict.run?.state,
      decision.verdict.questions,
      run.snapshot.routeDecision?.route,
      modifiersOf(run),
    ]),
  ).toEqual([
    ["ready", undefined, "add-feature", []],
    ["ready", undefined, "add-feature", []],
  ]);
});

// QFAI:EX-0001-0220-04
it("Answered with its first option, as a harness that may ask nothing does, the earliest candidate is taken", async () => {
  const { run, decision } = await routedBy(UNSURE);
  const [question] = decision.verdict.questions ?? [];
  answerOpen(run, "route", question?.options[0]?.optionId ?? "");

  expect({
    recommendation: question?.recommendation,
    route: run.snapshot.routeDecision,
    modifiers: modifiersOf(run),
  }).toEqual({
    recommendation: "fix-defect",
    route: { route: "repair-consistency", rule: 20 },
    modifiers: ["gate:user", "review:heavy"],
  });
});

// QFAI:EX-0001-0220-05
it("The route taken is never lighter than any candidate", async () => {
  const { run, decision } = await routedBy({
    intent: "feature",
    confidence: "medium",
    alternatives: [reading({ intent: "deprecation" })],
  });
  const lighter = answerOpen(run, "route", "add-feature");

  expect({
    options: decision.verdict.questions?.[0]?.options.map((option) => option.optionId),
    recommendation: decision.verdict.questions?.[0]?.recommendation,
    lighter: [lighter.verdict.run?.state, run.snapshot.routeDecision?.route],
    modifiers: modifiersOf(run),
  }).toEqual({
    options: ["change-compatibility", "add-feature"],
    recommendation: "add-feature",
    lighter: ["ready", "add-feature"],
    modifiers: ["gate:user", "review:heavy"],
  });
});

const NOTES = "CHANGELOG.md";

const QA_PASS = [
  {
    role: "qa-gatekeeper",
    agentInstance: "agent-qa-1",
    verdict: "PASS",
    reportRef: "reviews/qa-gatekeeper.json",
  },
];

// QFAI:EX-0001-0221-07
it("Release notes are drafted, the run waits for release approval, and finish needs no verify stage", async () => {
  const { run } = await routedBy(
    { intent: "release", signals: ["release-notes"], artifacts: ["release"] },
    { affectedFlowIds: [], proposedWriteScope: [NOTES] },
  );
  const facts = await runFacts();
  const draft = run.next(facts);
  const drafted = run.accept(
    {
      testObservation: "not_applicable",
      changedFiles: [{ path: NOTES, digest: "c".repeat(64) }],
      reviewResults: QA_PASS,
    },
    facts,
  );
  const asked = run.apply({ operation: "next" }, facts);
  answerOpen(run, "release", "approve");
  const done = run.apply({ operation: "next" }, facts);
  const finished = run.apply(
    { operation: "finish" },
    { completion: { ...quietCompletion(), changedPaths: [NOTES] } },
  );

  expect({
    route: run.snapshot.routeDecision?.route,
    draft: (draft.steps ?? []).map((step) => step.name),
    drafted: drafted.verdict.run?.state,
    asked: [asked.verdict.run?.state, asked.verdict.questions?.map((each) => each.purpose)],
    done: done.verdict.workOrder,
    finished: [finished.verdict.run?.state, finished.verdict.unmet],
  }).toEqual({
    route: "draft-release-notes",
    draft: ["verify-release-notes"],
    drafted: "ready",
    asked: ["awaiting_input", ["release"]],
    done: null,
    finished: ["completed", []],
  });
});
