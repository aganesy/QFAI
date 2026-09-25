// QFAI:SPEC-0018:TC-0018-0173
// QFAI:SPEC-0018:TC-0018-0174

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { validateProject } from "../../../src/core/validate.js";
import { field, minimalProject, removeProjects, startRun, workflow } from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0173 (TDD-0376): Built CLI start with no workflow key in qfai", async () => {
  const root = await minimalProject("paths:\n  specsDir: .qfai/specs\n");
  const runId = await startRun(root).catch(() => undefined);
  const status = workflow(root, ["status"]);

  expect({ created: runId !== undefined, mode: field(status.json, "mode") }).toEqual({
    created: true,
    mode: "active",
  });
});

it("TC-0018-0174 (TDD-0377): npx qfai validate with workflow", async () => {
  const root = await minimalProject();
  await writeFile(path.join(root, "qfai.config.yaml"), "workflow:\n  mode: always\n");
  const result = await validateProject(root);
  const issues = result.issues.filter(
    (issue) => issue.code === "QFAI_CONFIG_INVALID" && issue.message.includes("workflow.mode"),
  );

  expect(issues.map((issue) => issue.severity)).toEqual(["error"]);
});
