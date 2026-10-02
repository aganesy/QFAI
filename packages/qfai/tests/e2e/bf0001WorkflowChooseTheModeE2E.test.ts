// QFAI:BF-0001
/**
 * E2E: the mode decides how much the entry does.
 *
 * On a `qfai init` project, `off` and `shadow` write nothing and create no run, even with a
 * payload in the inbox that would not parse. A mode the contract does not name is refused
 * `fail-closed` before any run exists, and a project that sets no mode runs `active`.
 */
import { appendFile, readdir } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  START_INPUT,
  commitAll,
  field,
  inbox,
  initProject,
  removeProjects,
  treeDigest,
  workflow,
} from "./workflowJourney.js";

afterEach(removeProjects);

async function runDirectories(root: string): Promise<string[]> {
  const names = await readdir(path.join(root, ".qfai", "run")).catch(() => []);
  return names.filter((name) => /^run-\d{17}$/.test(name));
}

// What `start` and `status` report under `mode`, and what `start` left on disk.
async function startIn(mode: string | undefined, payload: unknown = START_INPUT) {
  const root = await initProject();
  if (mode !== undefined) {
    await appendFile(path.join(root, "qfai.config.yaml"), `\nworkflow:\n  mode: ${mode}\n`);
    commitAll(root);
  }
  const input = await inbox(root, null, "start", payload);
  const before = await treeDigest(root);
  const started = workflow(root, ["start", "--in", input]);
  return {
    exit: started.status,
    run: field(started.json, "run.state") ?? field(started.json, "run"),
    reported: field(started.json, "mode") ?? field(started.json, "error.cause"),
    status: field(workflow(root, ["status"]).json, "mode"),
    runs: (await runDirectories(root)).length,
    unchanged: (await treeDigest(root)) === before,
  };
}

it("off and shadow write nothing, an invalid mode is refused fail-closed, and no mode set is active", async () => {
  const quiet = { exit: 0, run: null, runs: 0, unchanged: true };
  const absent = await startIn(undefined);

  expect({
    off: await startIn("off"),
    shadow: await startIn("shadow", { request: 5 }),
    invalid: await startIn("always"),
    absent: [absent.exit, absent.run, absent.status, absent.runs],
  }).toEqual({
    off: { ...quiet, reported: "off", status: "off" },
    shadow: { ...quiet, reported: "shadow", status: "shadow" },
    invalid: { ...quiet, exit: 2, reported: "invalid-mode", status: null },
    absent: [0, "routing", "active", 1],
  });
}, 600_000);
