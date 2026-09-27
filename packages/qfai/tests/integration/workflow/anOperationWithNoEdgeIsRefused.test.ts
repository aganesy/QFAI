// QFAI:AC-0001-0196-10
// QFAI:EX-0001-0196-17

import { afterEach, expect, it } from "vitest";

import {
  field,
  minimalProject,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const reasonsOf = (document: unknown) => {
  const reasons = field(document, "error.reasons");
  return Array.isArray(reasons) ? reasons.map((each) => field(each, "reason")) : [];
};

it("Built CLI accept on a run in ready, finish on a run in running, accept on a cancelled run", async () => {
  const root = await minimalProject();
  const { runId, routing, routed } = await routedRun(root);
  const early = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "early-1", { expectedSequence: field(routed.json, "run.sequence") }),
  );
  const ready = workflow(root, ["status", "--run", runId]);
  const issued = workflow(root, ["next", "--run", runId]);
  const finished = workflow(root, ["finish", "--run", runId]);
  const unmet = field(finished.json, "unmet");
  await submit(root, runId, "decision", {
    stop: true,
    answeredBy: "operator",
    expectedSequence: field(issued.json, "run.sequence"),
  });
  const late = await submit(root, runId, "accept", resultFor(issued.json, "late-1"));

  expect({
    early: [field(early.json, "error.code"), reasonsOf(early.json)],
    ready: [field(ready.json, "run.state"), field(ready.json, "run.sequence")],
    finished: [
      field(finished.json, "run.state"),
      Array.isArray(unmet)
        ? unmet.some((entry) => field(entry, "condition") === "work-order-outstanding")
        : unmet,
    ],
    late: field(late.json, "error.code"),
  }).toEqual({
    early: ["invalid-input", ["work-order"]],
    ready: ["ready", field(routed.json, "run.sequence")],
    finished: ["running", true],
    late: "run-terminal",
  });
});
