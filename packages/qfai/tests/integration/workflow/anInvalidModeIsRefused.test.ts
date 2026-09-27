// QFAI:SPEC-0018:TC-0018-0175

import { readdir } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  field,
  inbox,
  minimalProject,
  removeProjects,
  START_INPUT,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0175 (TDD-0378): Built CLI start with workflow", async () => {
  const root = await minimalProject("workflow:\n  mode: always\n");
  const started = workflow(root, ["start", "--in", await inbox(root, null, "start", START_INPUT)]);
  const entries = await readdir(path.join(root, ".qfai", "runs"));

  expect({
    exit: started.status,
    code: field(started.json, "error.code"),
    cause: field(started.json, "error.cause"),
    runDirs: entries.filter((name) => name.startsWith("run-")),
  }).toEqual({ exit: 2, code: "fail-closed", cause: "invalid-mode", runDirs: [] });
});
