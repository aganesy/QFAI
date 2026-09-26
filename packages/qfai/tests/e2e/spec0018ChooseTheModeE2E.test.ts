/**
 * E2E: the mode decides how much the entry does (spec-0018).
 *
 * On a `qfai init` project, `off` and `shadow` write nothing and create no run, and a mode the
 * contract does not name is refused `fail-closed` before any run exists.
 */
import { appendFile, readdir } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  commitAll,
  field,
  inbox,
  initProject,
  removeProjects,
  START_INPUT,
  treeDigest,
  workflow,
} from "../integration/workflow/workflowProject.js";

afterEach(removeProjects);

// Everything `start` and `status` report for `mode`, and what `start` left on disk.
async function startIn(mode: string) {
  const root = await initProject();
  await appendFile(path.join(root, "qfai.config.yaml"), `\nworkflow:\n  mode: ${mode}\n`);
  commitAll(root);
  const input = await inbox(root, null, "start", START_INPUT);
  const before = await treeDigest(root);
  const started = workflow(root, ["start", "--in", input]);
  const runDirs = (await readdir(path.join(root, ".qfai", "runs"))).filter((name) =>
    name.startsWith("run-"),
  );
  return {
    exit: started.status,
    mode: field(started.json, "mode") ?? field(started.json, "error.cause"),
    status: field(workflow(root, ["status"]).json, "mode"),
    runDirs,
    unchanged: (await treeDigest(root)) === before,
  };
}

// QFAI:SPEC-0018:US-0018-0008
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0008 (TDD-0462): off and shadow write nothing, and an invalid mode is refused fail-closed", async () => {
  const quiet = { exit: 0, runDirs: [], unchanged: true };

  expect({
    off: await startIn("off"),
    shadow: await startIn("shadow"),
    invalid: await startIn("always"),
  }).toEqual({
    off: { ...quiet, mode: "off", status: "off" },
    shadow: { ...quiet, mode: "shadow", status: "shadow" },
    invalid: { exit: 2, mode: "invalid-mode", status: null, runDirs: [], unchanged: true },
  });
}, 300_000);
