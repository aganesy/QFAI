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

const DELIBERATION = ".qfai/discussion";
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
    expect(await safeCompletedCorpus(analysis, DELIBERATION, "", engineDirectory)).toBe(true);
  },
);

it.each([
  [".codegraph", "analysis.lock"],
  [".codegraph", "engine.pid"],
  ["graphify-out", "cache/run.lock"],
  ["graphify-out", "worker.PID"],
])("rejects a live engine marker in %s: %s", async (engineDirectory, marker) => {
  const file = path.join(analysis, engineDirectory, ...marker.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "");
  expect(await safeCompletedCorpus(analysis, DELIBERATION, "", engineDirectory)).toBe(false);
});
