// QFAI:AC-0001-0192-01
// QFAI:AC-0001-0192-02

import { afterEach, expect, it } from "vitest";

import { FEATURE_PROPOSAL } from "../../e2e/workflowFeatureRun.js";
import {
  answer,
  field,
  initProject,
  list,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
} from "../../e2e/workflowJourney.js";
import { humanDecisions } from "./acceptanceRuns.js";

afterEach(removeProjects);

const SECOND_STORY = {
  goal: "Remove a notification address",
  covers: ["removing one address"],
  excludes: ["sending the notifications"],
  evidence: ["No story names removing an address."],
  flowId: null,
};

const TWO_STORIES = {
  ...FEATURE_PROPOSAL,
  newStories: [...FEATURE_PROPOSAL.newStories, SECOND_STORY],
};

it("Each new story is asked about once, in the routing round, and recorded through decision", async () => {
  const root = await initProject();
  const { runId, routed } = await routedRun(root, TWO_STORIES);
  const questions = list(routed.json, "questions");
  const waiting = workflow(root, ["next", "--run", runId]);
  for (const question of questions) await answer(root, runId, question, "proceed");
  const sdd = workflow(root, ["next", "--run", runId]);
  const records = await humanDecisions(root, runId);
  const slots = questions.map((question) => field(question, "story.slotId"));

  expect({
    routed: field(routed.json, "run.state"),
    kinds: questions.map((question) => field(question, "kind")),
    distinctSlots: new Set(slots).size,
    waiting: field(waiting.json, "workOrder"),
    sdd: [field(sdd.json, "workOrder.stageKind"), field(sdd.json, "workOrder.target.kind")],
    sddSlot: slots.includes(field(sdd.json, "workOrder.target.slotId")),
    records: records.map((record) => [
      field(record, "operation"),
      field(record, "capture"),
      slots.includes(field(record, "target.slotId")),
    ]),
    reasked: list(workflow(root, ["status", "--run", runId]).json, "questions"),
  }).toEqual({
    routed: "awaiting_input",
    kinds: ["create", "create"],
    distinctSlots: 2,
    waiting: null,
    sdd: ["sdd", "new_story"],
    sddSlot: true,
    records: [
      ["CREATE", "agent_captured", true],
      ["CREATE", "agent_captured", true],
    ],
    reasked: [],
  });
}, 300_000);

it("The story-authoring work order carries its slot's approval, and a replan that widens the scope asks again", async () => {
  const root = await initProject();
  const { runId, routed } = await routedRun(root, FEATURE_PROPOSAL);
  const create = list(routed.json, "questions")[0];
  await answer(root, runId, create, "proceed");
  const sdd = workflow(root, ["next", "--run", runId]);
  const [record] = await humanDecisions(root, runId);
  const approval = String(field(record, "authorizationId"));
  // The stage finds that the scope needs settling first, which no stage of the plan owns.
  const outside = {
    findingCode: "scope-unsettled",
    path: ".qfai/spec/02_business-flow/business-flows.md",
    cause: "Which customers the addresses serve is not settled.",
    owningFlow: null,
    detectingCommand: "qfai-sdd Stage 1",
    resolvingOwner: "qfai-discussion",
    blockingExtent: "run",
  };
  const returned = await submit(
    root,
    runId,
    "accept",
    resultFor(sdd.json, "sdd-1", { outcome: "needs_repair", debts: [outside] }),
  );
  const routing = workflow(root, ["next", "--run", runId]);
  const widened = {
    ...FEATURE_PROPOSAL,
    proposedWriteScope: [...FEATURE_PROPOSAL.proposedWriteScope, "docs/**"],
  };
  const rerouted = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "route-2", { proposal: widened }),
  );
  const again = list(rerouted.json, "questions");

  expect({
    target: field(sdd.json, "workOrder.target"),
    cites: list(sdd.json, "workOrder.authorizationRefs").some((ref) =>
      String(ref).includes(approval),
    ),
    returned: field(returned.json, "run.state"),
    rerouted: field(rerouted.json, "run.state"),
    again: again.map((question) => field(question, "kind")),
    fresh: again.every((question) => field(question, "questionId") !== field(create, "questionId")),
    noWorkOrder: field(workflow(root, ["next", "--run", runId]).json, "workOrder"),
  }).toEqual({
    target: { kind: "new_story", slotId: field(create, "story.slotId") },
    cites: true,
    returned: "routing",
    rerouted: "awaiting_input",
    again: ["create"],
    fresh: true,
    noWorkOrder: null,
  });
}, 300_000);
