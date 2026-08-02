/**
 * Regression: `runCanonicalUixValidators` must actually reach a discussion pack.
 *
 * The admission probe was `<root>/01_Spec.md`. Both call sites in `validate.ts`
 * pass the repo root, and `01_Spec.md` is a spec file no discussion pack
 * contains — a pack has `01_Context.md`. So the gate never opened and all eight
 * canonical UIX validators were inert on every documented invocation, including
 * `qfai validate --profile discussion --fail-on error`.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runCanonicalUixValidators } from "../../src/core/validators/uix/canonical.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-canonical-uix-"));
  tempDirs.push(dir);
  return dir;
}

/** Write a UI-bearing pack carrying one forbidden legacy sidecar. */
async function writeOffendingPack(packRoot: string): Promise<void> {
  await mkdir(path.join(packRoot, "uiux"), { recursive: true });
  await writeFile(path.join(packRoot, "01_Context.md"), "# Context\n\n- surface: web\n", "utf-8");
  await writeFile(path.join(packRoot, "uiux", "10_strategy.md"), "# Strategy\n", "utf-8");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("runCanonicalUixValidators pack resolution", () => {
  it("resolves the latest discussion pack when handed a repo root", async () => {
    const root = await newTempDir();
    await writeOffendingPack(
      path.join(root, ".qfai", "discussion", "discussion-20260101000000000"),
    );

    const issues = await runCanonicalUixValidators(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("UIX-VAL-3LAYER-FORBIDDEN-FILE");
  });

  it("runs against the newest pack when several exist", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    // Older pack is clean; the newest one carries the violation. Reporting the
    // violation proves the newest pack — not merely the first readdir entry —
    // is the one validated.
    await mkdir(path.join(discussionDir, "discussion-20250101000000000", "uiux"), {
      recursive: true,
    });
    await writeFile(
      path.join(discussionDir, "discussion-20250101000000000", "01_Context.md"),
      "# Context\n\n- surface: non-ui\n",
      "utf-8",
    );
    await writeOffendingPack(path.join(discussionDir, "discussion-20260101000000000"));

    const issues = await runCanonicalUixValidators(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("UIX-VAL-3LAYER-FORBIDDEN-FILE");
  });

  it("accepts a pack root directly", async () => {
    const packRoot = await newTempDir();
    await writeOffendingPack(packRoot);

    const issues = await runCanonicalUixValidators(packRoot, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("UIX-VAL-3LAYER-FORBIDDEN-FILE");
  });

  it("stays silent when no pack can be resolved", async () => {
    const root = await newTempDir();

    await expect(runCanonicalUixValidators(root, defaultConfig)).resolves.toEqual([]);
  });

  it("does not fall back to the repo root itself when the pack is absent", async () => {
    // A repo root with a stray `uiux/` directory but no pack must not be
    // treated as a pack: that would report every rule against the repo.
    const root = await newTempDir();
    await mkdir(path.join(root, "uiux"), { recursive: true });
    await writeFile(path.join(root, "uiux", "10_strategy.md"), "# Strategy\n", "utf-8");

    await expect(runCanonicalUixValidators(root, defaultConfig)).resolves.toEqual([]);
  });
});
