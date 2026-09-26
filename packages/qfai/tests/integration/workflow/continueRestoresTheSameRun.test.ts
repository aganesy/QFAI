// QFAI:AC-0001-0196-02
// QFAI:EX-0001-0196-05

import { afterEach, expect, it } from "vitest";

import { field, minimalProject, removeProjects, routedRun, workflow } from "./workflowProject.js";

afterEach(removeProjects);

it("Built CLI status with no --run in a worktree holding one non-terminal run", async () => {
  const root = await minimalProject();
  const { runId, routed } = await routedRun(root);
  const status = workflow(root, ["status"]);

  expect(field(status.json, "run")).toEqual(field(routed.json, "run"));
  expect(field(status.json, "run.id")).toBe(runId);
});
