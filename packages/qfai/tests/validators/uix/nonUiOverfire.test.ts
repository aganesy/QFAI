/**
 * Non-UI over-fire regression test — spec-0037 TDD-0014
 *
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { runCanonicalUixValidators } from "../../../src/core/validators/uix/canonical.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-overfire-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** A complete, valid `ui_bearing: false` Classification block. */
const NON_UI_CONTEXT = [
  "# Context",
  "",
  "## UI-bearing Classification",
  "",
  "- ui_bearing: false",
  "- primary_surface: non-ui",
  "- secondary_surfaces:",
  "- classification_rationale: Library-only change with no rendered surface.",
  "",
].join("\n");

describe("non-UI regression", () => {
  it("zero UI-bearing fires", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await runCanonicalUixValidators(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  // The case above has no `01_Context.md`, so production's `resolvePackRoots`
  // would not even treat it as a pack root and every validator behind the gate
  // returns early on absent input. A valid non-UI pack is the input that can
  // actually catch a canonical validator over-firing on `ui_bearing: false`.
  it("zero fires on a valid non-UI pack", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), NON_UI_CONTEXT, "utf-8");
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await runCanonicalUixValidators(root, defaultConfig);

    expect(issues.map((i) => i.code)).toEqual([]);
  });
});
