// QFAI:AC-0001-0199-02
// QFAI:EX-0001-0199-04

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { validateProject } from "../../../src/core/validate.js";
import { field, minimalProject, removeProjects, startRun, workflow } from "./workflowProject.js";

afterEach(removeProjects);

it("Built CLI start with no workflow key in qfai", async () => {
  const root = await minimalProject("paths:\n  specsDir: .qfai/spec\n");
  const runId = await startRun(root).catch(() => undefined);
  const status = workflow(root, ["status"]);

  expect({ created: runId !== undefined, mode: field(status.json, "mode") }).toEqual({
    created: true,
    mode: "active",
  });
});

it("npx qfai validate with workflow", async () => {
  const root = await minimalProject();
  await writeFile(path.join(root, "qfai.config.yaml"), "workflow:\n  mode: always\n");
  const result = await validateProject(root);
  const issues = result.issues.filter(
    (issue) => issue.code === "QFAI_CONFIG_INVALID" && issue.message.includes("workflow.mode"),
  );

  expect(issues.map((issue) => issue.severity)).toEqual(["error"]);
});
