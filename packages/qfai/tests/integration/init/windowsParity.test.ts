/**
 * Integration: init and upgrade give the same result through the built CLI under a root whose
 * name contains a space as they do in process.
 */
// QFAI:AC-0001-0196-06
import { spawnSync } from "node:child_process";
import { readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HOST_SKILL_DIRS, initQuietly, modeLines, withEmptyRepo } from "./upgradeStates.js";

const CLI = path.resolve(import.meta.dirname, "../../../dist/cli/index.mjs");

type RunView = { modeLines: string[]; wrappers: string[] };

/** What a run must give alike in and out of process: the mode line and the wrapper targets. */
async function viewOf(root: string, output: string): Promise<RunView> {
  const realRoot = await realpath(root);
  const wrappers: string[] = [];
  for (const host of HOST_SKILL_DIRS) {
    const dir = path.join(root, ...host.split("/"));
    for (const name of await readdir(dir).catch(() => [])) {
      const target = path.relative(realRoot, await realpath(path.join(dir, name)));
      wrappers.push(`${host}/${name} -> ${target.split(path.sep).join("/")}`);
    }
  }
  return { modeLines: modeLines(output), wrappers };
}

// QFAI:EX-0001-0196-17
describe("windows parity", () => {
  it("Built CLI init and upgrade under a root with a space", async () => {
    const spawned: RunView[] = [];
    await withEmptyRepo(async (root) => {
      for (let run = 0; run < 2; run += 1) {
        const result = spawnSync(process.execPath, [CLI, "init", "--yes"], {
          cwd: root,
          encoding: "utf-8",
        });
        expect(result.status, result.stderr).toBe(0);
        spawned.push(await viewOf(root, result.stdout));
      }
    });
    const inProcess: RunView[] = [];
    await withEmptyRepo(async (root) => {
      for (let run = 0; run < 2; run += 1) {
        inProcess.push(await viewOf(root, await initQuietly(root)));
      }
    });

    expect(spawned).toEqual(inProcess);
    expect(spawned.map((view) => view.modeLines)).toEqual([
      ["Workflow mode: active"],
      ["Workflow mode: active"],
    ]);
  });
});
