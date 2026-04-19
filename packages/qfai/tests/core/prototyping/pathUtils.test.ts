/**
 * Unit tests for pathUtils.ts — TC-0012-0198..0201, TC-0012-0210..0211 (v1.7.15 rev8 WS-1/WS-3)
 *
 * Backfill TDD: production code landed in v1.7.15 rev8 before unit tests were bound to TC-IDs.
 * Exception pattern sanctioned by DR-0012-0046.
 */
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertConcreteArtifactRef,
  isConcreteArtifactRef,
  toRepoRelativeArtifactRef,
} from "../../../src/core/prototyping/pathUtils.js";

const pkgRoot = path.resolve(import.meta.dirname, "../../..");
function srcPath(...segments: string[]): string {
  return path.join(pkgRoot, "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// TC-0012-0198..0201: toRepoRelativeArtifactRef function (v1.7.15 rev8 WS-1)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0198
// QFAI:SPEC-0012:TC-0012-0199
// QFAI:SPEC-0012:TC-0012-0200
// QFAI:SPEC-0012:TC-0012-0201
describe("TC-0012-0198..0201: toRepoRelativeArtifactRef (v1.7.15 rev8 WS-1)", () => {
  it("TC-0012-0198: returns POSIX repo-relative path for a .json file inside .qfai/", () => {
    const root = path.join(os.tmpdir(), "qfai-tc0198");
    const filePath = path.join(root, ".qfai", "evidence", "render.json");
    const result = toRepoRelativeArtifactRef({ repoRoot: root, absolutePath: filePath });
    expect(result).toBe(".qfai/evidence/render.json");
    expect(path.isAbsolute(result)).toBe(false);
    expect(result).not.toContain("\\");
  });

  it("TC-0012-0199: throws for path outside repo root", () => {
    const root = path.join(os.tmpdir(), "qfai-tc0199-root-A");
    const outside = path.join(os.tmpdir(), "qfai-tc0199-root-B", ".qfai", "evidence", "screen.png");
    expect(() => toRepoRelativeArtifactRef({ repoRoot: root, absolutePath: outside })).toThrow();
  });

  it("TC-0012-0200: throws for directory path (no allowed extension)", () => {
    const root = path.join(os.tmpdir(), "qfai-tc0200");
    const dirPath = path.join(root, ".qfai", "evidence", "iter0");
    expect(() => toRepoRelativeArtifactRef({ repoRoot: root, absolutePath: dirPath })).toThrow();
  });

  it("TC-0012-0201: throws when both line and anchor are specified", () => {
    const root = path.join(os.tmpdir(), "qfai-tc0201");
    const filePath = path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md");
    expect(() =>
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: filePath,
        line: 5,
        anchor: "section-a",
      }),
    ).toThrow(/both line and anchor/);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0210..0211: isConcreteArtifactRef determinism and grammar locality (WS-3)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0210
// QFAI:SPEC-0012:TC-0012-0211
describe("TC-0012-0210..0211: isConcreteArtifactRef determinism and no parallel grammar (v1.7.15 rev8 WS-3)", () => {
  it("TC-0012-0210: isConcreteArtifactRef returns same result for same input (determinism)", () => {
    const goodRef = ".qfai/evidence/render.json#/screens/0";
    const badRef = "/abs/path/file.md";
    expect(isConcreteArtifactRef(goodRef)).toBe(true);
    expect(isConcreteArtifactRef(goodRef)).toBe(true);
    expect(isConcreteArtifactRef(badRef)).toBe(false);
    expect(isConcreteArtifactRef(badRef)).toBe(false);
    // assertConcreteArtifactRef is the throwing wrapper of the same predicate
    expect(() => assertConcreteArtifactRef(goodRef)).not.toThrow();
    expect(() => assertConcreteArtifactRef(badRef)).toThrow();
  });

  it("TC-0012-0211: no parallel grammar definition outside pathUtils.ts (source scan)", async () => {
    const specCov = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    const l2Ev = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    const runtimeGateBuilder = await readFile(
      srcPath("prototyping", "runtimeGateBuilder.ts"),
      "utf-8",
    );
    expect(specCov).toMatch(/from ['"]\.\/pathUtils\.js['"]/);
    expect(l2Ev).toMatch(/from ['"]\.\/pathUtils\.js['"]/);
    expect(runtimeGateBuilder).toMatch(/from ['"]\.\/pathUtils\.js['"]/);
  });
});
