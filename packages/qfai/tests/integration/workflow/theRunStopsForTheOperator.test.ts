// QFAI:AC-0001-0195-01
// QFAI:AC-0001-0195-02
// QFAI:AC-0001-0195-03
// QFAI:AC-0001-0195-04
// QFAI:AC-0001-0195-06
// QFAI:AC-0001-0195-07

import { afterEach, expect, it } from "vitest";

import {
  DISCOVERY_PROPOSAL,
  START_INPUT,
  field,
  initProject,
  list,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
} from "../../e2e/workflowJourney.js";
import { flowProject, humanDecisions, proposalFor } from "./acceptanceRuns.js";

afterEach(removeProjects);

const GO_AHEAD = {
  kind: "decision",
  text: "This change deletes the stored notification history. Go ahead with it?",
  options: [
    { optionId: "go", label: "Go ahead", description: "The run continues.", effect: "proceed" },
    { optionId: "stop", label: "Stop", description: "The run ends.", effect: "stop" },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "stop",
};

const reasonsOf = (document: unknown) =>
  list(document, "error.reasons").map((each) => field(each, "reason"));

// Answers the run's one open question with `answer` at the run's current sequence.
async function decide(root: string, runId: string, answer: object) {
  const status = workflow(root, ["status", "--run", runId]);
  return submit(root, runId, "decision", {
    questionId: field(list(status.json, "questions")[0], "questionId"),
    answer,
    answeredBy: "operator",
    expectedSequence: field(status.json, "run.sequence"),
  });
}

it("A material risk opened as a question stops routing, and one opened as nothing is refused", async () => {
  const root = await initProject();
  const risky = { ...DISCOVERY_PROPOSAL, riskSignals: ["data-loss"] };
  const unasked = await routedRun(root, risky);
  await submit(root, unasked.runId, "decision", { stop: true, answeredBy: "operator" });
  const asked = await routedRun(root, { ...risky, unresolvedQuestions: [GO_AHEAD] });

  expect({
    unasked: [
      field(unasked.routed.json, "error.code"),
      reasonsOf(unasked.routed.json),
      field(unasked.routed.json, "run.state"),
    ],
    asked: [
      field(asked.routed.json, "run.state"),
      list(asked.routed.json, "questions").map((question) => field(question, "text")),
      field(workflow(root, ["next", "--run", asked.runId]).json, "workOrder"),
    ],
  }).toEqual({
    unasked: ["proposal-refused", ["unresolved-approval"], "routing"],
    asked: ["awaiting_input", [GO_AHEAD.text], null],
  });
}, 300_000);

it("A request naming a push authorizes no external effect in any work order", async () => {
  const root = await flowProject();
  const input = { ...START_INPUT, request: { text: "Fix the typo in the README and push it." } };
  const { runId } = await routedRun(root, proposalFor("direct"), input);
  const edit = workflow(root, ["next", "--run", runId]);
  await submit(root, runId, "accept", resultFor(edit.json, "edit-1"));
  const verify = workflow(root, ["next", "--run", runId]);

  expect(
    [edit, verify].map((each) => [
      field(each.json, "workOrder.stageKind"),
      list(each.json, "workOrder.scope.allowedEffects"),
    ]),
  ).toEqual([
    ["maintenance", []],
    ["verify", []],
  ]);
}, 300_000);

const MIXED = {
  kind: "decision",
  text: "Which follow-ups should the run take?",
  options: [
    { optionId: "keep", label: "Keep going", description: "The run continues.", effect: "proceed" },
    { optionId: "halt", label: "Stop here", description: "The run ends.", effect: "stop" },
  ],
  selection: { min: 1, max: 2 },
  recommendation: "keep",
};

it("The strongest effect of the chosen options decides what the run does, within the offered set", async () => {
  const root = await initProject();
  const { runId } = await routedRun(root, { ...DISCOVERY_PROPOSAL, unresolvedQuestions: [MIXED] });
  const outside = await decide(root, runId, { optionIds: ["elsewhere"] });
  const tooMany = await decide(root, runId, { optionIds: ["keep", "halt", "keep"] });
  const both = await decide(root, runId, { optionIds: ["keep", "halt"] });

  expect({
    outside: [field(outside.json, "error.code"), reasonsOf(outside.json)],
    tooMany: field(tooMany.json, "error.code"),
    both: [both.status, field(both.json, "run.state")],
  }).toEqual({
    outside: ["invalid-input", ["option"]],
    tooMany: "invalid-input",
    both: [0, "cancelled"],
  });
}, 300_000);

it("An unanswered question authorizes nothing: no work order, no decision recorded, and finish waits", async () => {
  const root = await initProject();
  const { runId } = await routedRun(root, {
    ...DISCOVERY_PROPOSAL,
    riskSignals: ["data-loss"],
    unresolvedQuestions: [GO_AHEAD],
  });
  const next = workflow(root, ["next", "--run", runId]);
  const finish = workflow(root, ["finish", "--run", runId]);

  expect({
    next: [field(next.json, "workOrder"), list(next.json, "questions").length > 0],
    decisions: await humanDecisions(root, runId),
    finish: list(finish.json, "unmet").map((unmet) => field(unmet, "condition")),
  }).toEqual({
    next: [null, true],
    decisions: [],
    finish: expect.arrayContaining(["run-waiting"]),
  });
}, 300_000);

it("An approval inside a stage result, and an answer to no open question, are refused", async () => {
  const root = await initProject();
  const { runId } = await routedRun(root, DISCOVERY_PROPOSAL);
  const discussion = workflow(root, ["next", "--run", runId]);
  const approved = await submit(
    root,
    runId,
    "accept",
    resultFor(discussion.json, "discussion-1", { approved: true }),
  );
  const status = workflow(root, ["status", "--run", runId]);
  const unasked = await submit(root, runId, "decision", {
    questionId: "question-never-opened",
    answer: { optionIds: ["go"] },
    answeredBy: "operator",
    expectedSequence: field(status.json, "run.sequence"),
  });

  expect({
    approved: [field(approved.json, "error.code"), reasonsOf(approved.json)],
    unasked: [unasked.status, field(unasked.json, "error.code")],
    decisions: await humanDecisions(root, runId),
  }).toEqual({
    approved: ["invalid-input", ["schema"]],
    unasked: [2, "no-open-question"],
    decisions: [],
  });
}, 300_000);

it("The same answer twice is recorded once, and a different answer to it is refused", async () => {
  const root = await initProject();
  const { runId } = await routedRun(root, {
    ...DISCOVERY_PROPOSAL,
    riskSignals: ["data-loss"],
    unresolvedQuestions: [GO_AHEAD],
  });
  const status = workflow(root, ["status", "--run", runId]);
  const question = list(status.json, "questions")[0];
  const decision = (optionId: string) =>
    submit(root, runId, "decision", {
      questionId: field(question, "questionId"),
      answer: { optionIds: [optionId] },
      answeredBy: "operator",
      expectedSequence: field(status.json, "run.sequence"),
    });
  const first = await decision("go");
  const repeat = await decision("go");
  const other = await decision("stop");

  expect({
    first: [first.status, field(first.json, "run.state")],
    repeat: [repeat.status, field(repeat.json, "run.state")],
    other: [other.status, field(other.json, "error.code")],
    recorded: (await humanDecisions(root, runId)).length,
  }).toEqual({
    first: [0, "ready"],
    repeat: [0, "ready"],
    other: [2, "answer-conflict"],
    recorded: 1,
  });
}, 300_000);
