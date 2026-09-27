/**
 * E2E: a run stops only for the operator's decision or a fact only they hold (spec-0018).
 *
 * On a `qfai init` project, routing that carries a material risk opens one question and waits;
 * a `stop` then ends the run `cancelled`. Under a run, the discussion stage is handed what the
 * run has settled and returns the run to routing.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  DISCOVERY_PROPOSAL,
  field,
  initProject,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
} from "../integration/workflow/workflowProject.js";

afterEach(removeProjects);

const GO_AHEAD = {
  kind: "decision",
  text: "This change deletes the stored exports. Go ahead with it?",
  options: [
    { optionId: "go", label: "Go ahead", description: "The run continues.", effect: "proceed" },
    { optionId: "stop", label: "Stop", description: "The run ends.", effect: "stop" },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "stop",
};

const FORMAT = {
  kind: "fact",
  text: "Which file format should the export use?",
  effect: "proceed",
};

// QFAI:SPEC-0018:US-0018-0004
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0004 (TDD-0458): a material question waits unanswered, then a stop cancels the run", async () => {
  const root = await initProject();
  const proposal = {
    ...DISCOVERY_PROPOSAL,
    riskSignals: ["data-loss"],
    unresolvedQuestions: [GO_AHEAD],
  };
  const { runId, routed } = await routedRun(root, proposal);
  const waiting = workflow(root, ["next", "--run", runId]);
  const status = workflow(root, ["status", "--run", runId]);
  const stopped = await submit(root, runId, "decision", {
    stop: true,
    answeredBy: "operator",
    expectedSequence: field(status.json, "run.sequence"),
  });

  expect({
    routed: field(routed.json, "run.state"),
    question: [field(routed.json, "questions.0.kind"), field(routed.json, "questions.0.text")],
    unanswered: [field(waiting.json, "run.state"), field(waiting.json, "workOrder")],
    status: field(status.json, "run.state"),
    stopped: field(stopped.json, "run.state"),
  }).toEqual({
    routed: "awaiting_input",
    question: ["decision", GO_AHEAD.text],
    unanswered: ["awaiting_input", null],
    status: "awaiting_input",
    stopped: "cancelled",
  });
}, 180_000);

// QFAI:SPEC-0018:US-0018-0004
// QFAI:SPEC-0010:US-0010-0013
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0004, discussion variant (spec-0010 TDD-0033): the discussion stage gets what is settled and returns the run to routing", async () => {
  const root = await initProject();
  const { runId, routed } = await routedRun(root, {
    ...DISCOVERY_PROPOSAL,
    unresolvedQuestions: [FORMAT],
  });
  const questionId = field(routed.json, "questions.0.questionId");
  await submit(root, runId, "decision", {
    questionId,
    answer: { value: "CSV" },
    answeredBy: "operator",
    expectedSequence: field(routed.json, "run.sequence"),
  });
  const issued = workflow(root, ["next", "--run", runId]);
  const returned = await submit(root, runId, "accept", resultFor(issued.json, "discussion-1"));
  const skill = await readFile(
    path.join(
      root,
      ".qfai",
      "assistant",
      "skills",
      "qfai-discussion",
      "references",
      "orchestrated-mode.md",
    ),
    "utf8",
  );

  expect({
    stage: [field(issued.json, "workOrder.stageKind"), field(issued.json, "workOrder.operation")],
    settled: field(issued.json, "workOrder.settled.answers"),
    returned: field(returned.json, "run.state"),
    installed:
      skill.includes("resolve-unsettled-product-scope") &&
      skill.includes("## What is already settled"),
  }).toEqual({
    stage: ["discussion", "resolve-unsettled-product-scope"],
    settled: [{ questionId, text: FORMAT.text, chosen: "CSV" }],
    returned: "routing",
    installed: true,
  });
}, 180_000);
