/**
 * A completed analysis copy holds the project's own inputs beside the engine's
 * storage directory. Only a `.lock` or `.pid` file inside that storage marks a
 * run still in progress; a dependency lockfile among the inputs is ordinary
 * project content.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { safeCompletedCorpus } from "../../../src/core/graph/reuse.js";

const DELIBERATION = ".qfai/deliberation";
let analysis: string;

beforeEach(async () => {
  analysis = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-corpus-"));
  await mkdir(path.join(analysis, "crates", "checkout"), { recursive: true });
  await writeFile(path.join(analysis, "README.md"), "# Fixture\n");
  await writeFile(path.join(analysis, "yarn.lock"), "__metadata:\n  version: 8\n");
  await writeFile(path.join(analysis, "poetry.lock"), "[metadata]\n");
  await writeFile(path.join(analysis, "crates", "checkout", "Cargo.lock"), "version = 3\n");
});

afterEach(async () => {
  await rm(analysis, { recursive: true, force: true });
});

it.each([".codegraph", "graphify-out"])(
  "accepts dependency lockfiles among the project inputs beside %s",
  async (engineDirectory) => {
    await mkdir(path.join(analysis, engineDirectory));
    await writeFile(path.join(analysis, engineDirectory, "graph.json"), "{}\n");
    const checked = await safeCompletedCorpus(analysis, DELIBERATION, engineDirectory);
    expect(checked?.covers(analysis)).toBe(true);
  },
);

// Each marker path is relative to the analysis copy. An engine folder in another
// letter case, or one nested below the top, is not the engine's own storage, so
// it is refused as an excluded graph input.
it.each([
  [".codegraph", ".codegraph/analysis.lock"],
  [".codegraph", ".codegraph/engine.pid"],
  ["graphify-out", "graphify-out/cache/run.lock"],
  ["graphify-out", "graphify-out/worker.PID"],
  [".codegraph", ".CodeGraph/analysis.lock"],
  [".codegraph", "crates/.codegraph/x.lock"],
])("with engine directory %s, rejects a marker at %s", async (engineDirectory, marker) => {
  const file = path.join(analysis, ...marker.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "");
  expect(await safeCompletedCorpus(analysis, DELIBERATION, engineDirectory)).toBeUndefined();
});
