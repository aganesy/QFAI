/**
 * Pins the profile guidance shipped in
 * `qfai-implement/references/review-artifact-layout.md`.
 *
 * The doc tells the operator which `qfai validate` invocation surfaces
 * `QFAI-REVIEW-*` for a malformed review pack. `validateReviewArtifacts`
 * is wired into the full-scan profiles only, so naming a partial profile
 * there would send the operator to a command that reports nothing — the
 * exact failure this test exists to catch if the wiring or the doc moves.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { validateProject } from "../../src/core/validate.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

// Read the packaged asset, not the repo-root mirror: this is the copy a
// consuming project actually receives from `qfai init`.
const LAYOUT_DOC = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "references",
  "review-artifact-layout.md",
);

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** Project root holding one review pack whose summary.json is not valid JSON. */
async function seedRootWithBrokenReviewPack(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-profile-"));
  tempDirs.push(root);
  await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
  const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
  await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# R01\n", "utf-8");
  await writeFile(path.join(packDir, "summary.json"), "{ not json", "utf-8");
  return root;
}

async function reviewCodes(root: string, profile: "tdd" | "sdd" | "verify"): Promise<string[]> {
  const result = await validateProject(root, undefined, { profile });
  return result.issues.map((i) => i.code).filter((code) => code.startsWith("QFAI-REVIEW-"));
}

describe("review artifact profile wiring", () => {
  it("reports QFAI-REVIEW-* under the full-scan verify profile", async () => {
    const root = await seedRootWithBrokenReviewPack();
    expect(await reviewCodes(root, "verify")).not.toHaveLength(0);
  });

  it("does not report QFAI-REVIEW-* under the partial tdd / sdd profiles", async () => {
    const root = await seedRootWithBrokenReviewPack();
    expect(await reviewCodes(root, "tdd")).toEqual([]);
    expect(await reviewCodes(root, "sdd")).toEqual([]);
  });

  it("the shipped layout doc points at the profile that actually reports them", async () => {
    const doc = await readFile(LAYOUT_DOC, "utf-8");
    expect(doc).toContain("qfai validate --profile verify --fail-on error");
    expect(doc).not.toContain("qfai validate --profile sdd --fail-on error");
  });
});
