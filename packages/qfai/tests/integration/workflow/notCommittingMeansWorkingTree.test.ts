// QFAI:EX-0001-0192-25

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  field,
  minimalProject,
  removeProjects,
  START_INPUT,
  startRun,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("Git temp repo with the run's changed paths uncommitted", async () => {
  const root = await minimalProject();
  const runId = await startRun(root, { ...START_INPUT, completionTarget: "working_tree" });
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(path.join(root, "docs", "export.md"), "# Export\n");
  const finished = workflow(root, ["finish", "--run", runId]);

  expect(field(finished.json, "deliveryUnmet")).toEqual([
    { condition: "uncommitted", subject: "docs/export.md", owner: "operator" },
  ]);
});
