// QFAI:EX-0001-0196-06

import { afterEach, expect, it } from "vitest";

import {
  field,
  inbox,
  minimalProject,
  removeProjects,
  routedRun,
  START_INPUT,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("second start refused run-active, continue resumes the one run", async () => {
  const root = await minimalProject();
  const { runId } = await routedRun(root);
  const issued = workflow(root, ["next", "--run", runId]);
  const second = workflow(root, ["start", "--in", await inbox(root, null, "again", START_INPUT)]);
  const status = workflow(root, ["status"]);
  const resumed = workflow(root, ["resume", "--run", runId]);

  expect({
    running: field(issued.json, "run.state"),
    second: [field(second.json, "error.code"), field(second.json, "run.id")],
    status: field(status.json, "run.id"),
    resumed: field(resumed.json, "workOrder.workOrderId"),
    questions: field(resumed.json, "questions") ?? [],
  }).toEqual({
    running: "running",
    second: ["run-active", runId],
    status: runId,
    resumed: field(issued.json, "workOrder.workOrderId"),
    questions: [],
  });
});
