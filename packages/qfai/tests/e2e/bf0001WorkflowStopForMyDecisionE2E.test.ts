// QFAI:BF-0001
/**
 * E2E: a run stops only for the operator's decision or a fact only they hold.
 *
 * On a `qfai init` project, routing that carries a material risk opens one question and waits
 * with no work order; a `stop` then ends the run `cancelled`, and the run takes nothing further.
 * A missing fact is asked once as a value with no recommendation, and the discussion stage is
 * handed what the run has settled before the run returns to routing.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  DISCOVERY_PROPOSAL,
  answer,
  field,
  initProject,
  list,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
} from "./workflowJourney.js";

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

const FORMAT = {
  kind: "fact",
  text: "Which file format should the export use?",
  effect: "proceed",
};

it("a material question waits unanswered with no work order, then a stop cancels the run", async () => {
  const root = await initProject();
  const proposal = {
    ...DISCOVERY_PROPOSAL,
    riskSignals: ["data-loss"],
    unresolvedQuestions: [GO_AHEAD],
  };
  const { runId, routed } = await routedRun(root, proposal);
  const waiting = workflow(root, ["next", "--run", runId]);
  const status = workflow(root, ["status", "--run", runId]);
  const finish = workflow(root, ["finish", "--run", runId]);
  const stopped = await submit(root, runId, "decision", { stop: true, answeredBy: "operator" });
  const again = await submit(root, runId, "decision", { stop: true, answeredBy: "operator" });
  const next = workflow(root, ["next", "--run", runId]);

  expect({
    routed: field(routed.json, "run.state"),
    questions: list(routed.json, "questions").map((question) => [
      field(question, "kind"),
      field(question, "text"),
    ]),
    waiting: [waiting.status, field(waiting.json, "run.state"), field(waiting.json, "workOrder")],
    status: list(status.json, "questions").map((question) => field(question, "text")),
    finish: [
      finish.status,
      field(finish.json, "run.state"),
      list(finish.json, "unmet").map((unmet) => field(unmet, "condition")),
    ],
    stopped: [stopped.status, field(stopped.json, "run.state")],
    replayed: [again.status, field(again.json, "run.state")],
    next: [next.status, field(next.json, "error.code")],
  }).toEqual({
    routed: "awaiting_input",
    questions: [["decision", GO_AHEAD.text]],
    waiting: [0, "awaiting_input", null],
    status: [GO_AHEAD.text],
    finish: [1, "awaiting_input", expect.arrayContaining(["run-waiting"])],
    stopped: [0, "cancelled"],
    replayed: [0, "cancelled"],
    next: [2, "run-terminal"],
  });
}, 300_000);

const SCOPE = {
  kind: "decision",
  text: "Should the export also cover archived notifications?",
  options: [
    { optionId: "keep", label: "No", description: "The plan stays as it is.", effect: "proceed" },
    {
      optionId: "widen",
      label: "Yes",
      description: "The route is proposed again with the wider scope.",
      effect: "replan",
    },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "keep",
};

it("an answer that changes the scope sends the run back to routing, and qfai-run takes that work order itself", async () => {
  const root = await initProject();
  const { runId, routed } = await routedRun(root, {
    ...DISCOVERY_PROPOSAL,
    unresolvedQuestions: [SCOPE],
  });
  const replanned = await answer(root, runId, list(routed.json, "questions")[0], "replan");
  const routing = workflow(root, ["next", "--run", runId]);

  expect({
    replanned: [replanned.status, field(replanned.json, "run.state")],
    routing: [
      field(routing.json, "workOrder.stageKind"),
      field(routing.json, "workOrder.executor.skill"),
      field(routing.json, "workOrder.operation"),
      field(routing.json, "workOrder.target"),
    ],
  }).toEqual({
    replanned: [0, "routing"],
    routing: ["route", "qfai-run", "route", undefined],
  });
}, 300_000);

it("one missing fact is asked as a value, and the discussion stage gets what is settled before the run returns to routing", async () => {
  const root = await initProject();
  const { runId, routed } = await routedRun(root, {
    ...DISCOVERY_PROPOSAL,
    unresolvedQuestions: [FORMAT],
  });
  const question = list(routed.json, "questions")[0];
  const questionId = field(question, "questionId");
  const answered = await submit(root, runId, "decision", {
    questionId,
    answer: { value: "CSV" },
    answeredBy: "operator",
    expectedSequence: field(routed.json, "run.sequence"),
  });
  const issued = workflow(root, ["next", "--run", runId]);
  const settled = field(issued.json, "workOrder.settled");
  const returned = await submit(root, runId, "accept", resultFor(issued.json, "discussion-1"));
  const reference = await readFile(
    path.join(root, ".qfai/assistant/skill/qfai-discussion/references/orchestrated-mode.md"),
    "utf8",
  );

  expect({
    question: [field(question, "kind"), field(question, "recommendation")],
    answered: field(answered.json, "run.state"),
    stage: [field(issued.json, "workOrder.stageKind"), field(issued.json, "workOrder.operation")],
    routingResult: Object.values(Object(settled)).includes("route-1"),
    answers: Object.values(Object(settled)).find((value) => Array.isArray(value)),
    returned: field(returned.json, "run.state"),
    installed: reference.includes("`resolve-unsettled-product-scope`"),
  }).toEqual({
    question: ["fact", undefined],
    answered: "ready",
    stage: ["discussion", "resolve-unsettled-product-scope"],
    routingResult: true,
    answers: [{ questionId, text: FORMAT.text, chosen: "CSV" }],
    returned: "routing",
    installed: true,
  });
}, 300_000);
