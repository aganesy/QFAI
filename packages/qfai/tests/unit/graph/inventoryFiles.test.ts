/**
 * Both native inventories (CodeGraph and Graphify) are checked by one shared
 * file check, so a reported path is held to the same rules whichever engine
 * reported it.
 */

import { link, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { safeInventoryFiles } from "../../../src/core/graph/reuse.js";

const DELIBERATION = ".qfai/discussion";
let analysis: string;

beforeEach(async () => {
  analysis = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-inventory-"));
  await mkdir(path.join(analysis, "src"));
  await writeFile(path.join(analysis, "src", "checkout.ts"), "export {};\n");
  await writeFile(path.join(analysis, "README.md"), "# Fixture\n");
});

afterEach(async () => {
  await rm(analysis, { recursive: true, force: true });
});

it("accepts relative regular files in either separator form", async () => {
  expect(
    await safeInventoryFiles(
      analysis,
      ["src/checkout.ts", "src\\checkout.ts", "README.md"],
      DELIBERATION,
    ),
  ).toBe(true);
  expect(await safeInventoryFiles(analysis, [], DELIBERATION)).toBe(true);
});

it("rejects a reported path that is not a plain relative path", async () => {
  for (const file of [
    "",
    "/src/checkout.ts",
    "C:/checkout.ts",
    "../checkout.ts",
    "src//checkout.ts",
    "./README.md",
    "src/../README.md",
    7,
  ]) {
    expect(
      await safeInventoryFiles(analysis, ["README.md", file], DELIBERATION),
      String(file),
    ).toBe(false);
  }
});

it("rejects an excluded input, a missing file, a directory and a linked file", async () => {
  await writeFile(path.join(analysis, ".env"), "SECRET=1\n");
  await mkdir(path.join(analysis, ".qfai", "discussion"), { recursive: true });
  await writeFile(path.join(analysis, ".qfai", "discussion", "notes.md"), "notes\n");
  await link(path.join(analysis, "README.md"), path.join(analysis, "alias.md"));
  for (const file of [".env", ".qfai/discussion/notes.md", "missing.ts", "src", "alias.md"]) {
    expect(await safeInventoryFiles(analysis, [file], DELIBERATION), file).toBe(false);
  }
});
