// QFAI:EX-0001-0200-02

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  commitAll,
  field,
  inbox,
  minimalProject,
  removeProjects,
  START_INPUT,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const NO_CLAIM = "# Project\n\n## Agent integrations\n\nNo host is declared supported yet.\n";

// Starts a run with a passing capability report; `status` then reports the mode in force.
async function started(root: string) {
  commitAll(root);
  const run = workflow(root, ["start", "--in", await inbox(root, null, "start", START_INPUT)]);
  const status = workflow(root, ["status"]);
  return {
    exit: run.status,
    mode: field(status.json, "mode"),
    state: field(run.json, "run.state"),
  };
}

it("A temp project with no eval record and READMEs claiming no host", async () => {
  const claiming = await minimalProject("workflow:\n  mode: active\n");
  await writeFile(path.join(claiming, "README.md"), NO_CLAIM);
  // A README and an eval record the core could not read without failing: a directory where the
  // README would be, and a record that is not JSON.
  const unreadable = await minimalProject("workflow:\n  mode: active\n");
  await mkdir(path.join(unreadable, "README.md"), { recursive: true });
  await writeFile(path.join(unreadable, "README.md", "keep"), "");
  const records = path.join(unreadable, "tests", "eval", "records");
  await mkdir(records, { recursive: true });
  await writeFile(path.join(records, "claude-code-0.0.0.json"), "not json");

  const expected = { exit: 0, mode: "active", state: "routing" };
  expect({ claiming: await started(claiming), unreadable: await started(unreadable) }).toEqual({
    claiming: expected,
    unreadable: expected,
  });
});
