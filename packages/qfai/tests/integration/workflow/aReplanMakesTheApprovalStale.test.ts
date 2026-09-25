// QFAI:SPEC-0018:TC-0018-0006
// Fault seeds: FAULT-007

import { afterEach, expect, it } from "vitest";

import {
  FEATURE_PROPOSAL,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  startRun,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const scopeQuestion = {
  kind: "decision",
  text: "Should the export also cover invoices?",
  options: [
    {
      optionId: "keep",
      label: "Keep the scope",
      description: "The run goes on as planned.",
      effect: "proceed",
    },
    {
      optionId: "widen",
      label: "Widen the scope",
      description: "The run is planned again.",
      effect: "replan",
    },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "keep",
};

function questionOf(document: unknown, kind: string): unknown {
  const questions = field(document, "questions");
  return Array.isArray(questions)
    ? questions.find((question) => field(question, "kind") === kind)
    : undefined;
}

async function route(root: string, runId: string, resultId: string, proposal: object) {
  const routing = workflow(root, ["next", "--run", runId]);
  return submit(root, runId, "accept", resultFor(routing.json, resultId, { proposal }));
}

async function answer(root: string, runId: string, at: unknown, question: unknown, id: string) {
  return submit(root, runId, "decision", {
    questionId: field(question, "questionId"),
    answer: { optionIds: [id] },
    answeredBy: "operator",
    expectedSequence: field(at, "run.sequence"),
  });
}

// Each call decides on the snapshot the CLI folds from the run's journal, so the approval's
// scope digest and capability text reach the staleness check only through that journal.
it("TC-0018-0006: an approval given before a widening replan is asked again at issue", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);
  const proposal = { ...FEATURE_PROPOSAL, unresolvedQuestions: [scopeQuestion] };

  const routed = await route(root, runId, "route-1", proposal);
  const approved = await answer(
    root,
    runId,
    routed.json,
    questionOf(routed.json, "create"),
    "create",
  );
  const replanned = await answer(
    root,
    runId,
    approved.json,
    questionOf(routed.json, "decision"),
    "widen",
  );
  const widened = [...FEATURE_PROPOSAL.proposedWriteScope, "docs/**"];
  const rerouted = await route(root, runId, "route-2", {
    ...proposal,
    proposedWriteScope: widened,
  });
  const kept = await answer(
    root,
    runId,
    rerouted.json,
    questionOf(rerouted.json, "decision"),
    "keep",
  );

  const issued = workflow(root, ["next", "--run", runId]);
  const reasked = questionOf(issued.json, "create");

  expect({
    replanned: field(replanned.json, "run.state"),
    kept: field(kept.json, "run.state"),
    state: field(issued.json, "run.state"),
    workOrder: field(issued.json, "workOrder"),
    reaskedGoal: field(reasked, "capability.goal"),
    reaskedSlot: field(reasked, "capability.slotId"),
  }).toEqual({
    replanned: "routing",
    kept: "ready",
    state: "awaiting_input",
    workOrder: null,
    reaskedGoal: FEATURE_PROPOSAL.newCapabilities[0].goal,
    reaskedSlot: field(questionOf(routed.json, "create"), "capability.slotId"),
  });
});
