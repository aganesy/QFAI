// QFAI:SPEC-0018:TC-0018-0110

import { afterEach, expect, it } from "vitest";

import { field, minimalProject, removeProjects, routedRun, workflow } from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0110 (TDD-0328): Built CLI status with no --run in a worktree holding one non-terminal run", async () => {
  const root = await minimalProject();
  const { runId, routed } = await routedRun(root);
  const status = workflow(root, ["status"]);

  expect(field(status.json, "run")).toEqual(field(routed.json, "run"));
  expect(field(status.json, "run.id")).toBe(runId);
});
