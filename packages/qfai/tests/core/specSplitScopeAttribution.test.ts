/**
 * `--spec` could not scope the CAP-to-spec count findings.
 *
 * `QFAI-SPLIT-102` / `-103` / `-104` are filed against `specsRoot`, which no
 * spec owns, and the spec ids they name travelled only in `refs` — a field
 * `isFindingInSpecScope` does not read. All three therefore survived every
 * `--spec` filter at `error`, so a slice worker gating on its own spec failed
 * the moment a sibling agent created its `spec-NNNN/` directory and before that
 * sibling appended its CAP row.
 *
 * These tests pin the attribution end to end: the finding lists the directories
 * it implicates under `relatedFiles`, the real scope filter drops it when the
 * scoped spec is not one of them, and an unscoped run still sees everything.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, resolvePath } from "../../src/core/config.js";
import {
  isFindingInSpecScope,
  resolveSpecScope,
  type SpecScope,
} from "../../src/core/specScope.js";
import type { Issue } from "../../src/core/types.js";
import { validateSpecSplitByCapability } from "../../src/core/validators/specSplitByCapability.js";

async function seedCapabilities(root: string, capIds: readonly string[]): Promise<void> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(policiesDir, { recursive: true });
  await writeFile(
    path.join(policiesDir, "03_Capabilities.md"),
    [
      "# 03 Capabilities",
      "",
      "| CAP ID | Statement | Success metrics | Notes |",
      "| ------ | --------- | --------------- | ----- |",
      ...capIds.map((capId) => `| ${capId} | capability | metric | note |`),
      "",
    ].join("\n"),
    "utf-8",
  );
}

/**
 * A minimal layered (`v1421`) spec pack: `01_Spec.md` + `02_User-stories.md` +
 * a marker. `dirName` overrides the directory spelling so a case-sensitive
 * filesystem can hold two packs under one normalised id.
 */
async function seedSpec(
  root: string,
  specNumber: string,
  capId: string,
  dirName = `spec-${specNumber}`,
): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", dirName);
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    ["# 01 Spec", "", `- Spec: spec-${specNumber}`, `- Parent: ${capId}`, ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
  await writeFile(path.join(specDir, "05_Examples.md"), "# 05 Examples\n", "utf-8");
}

function scopedCodes(
  issues: readonly Issue[],
  root: string,
  scope: SpecScope | undefined,
): string[] {
  const roots = { root, specsRoot: resolvePath(root, defaultConfig, "specsDir") };
  return issues
    .filter((finding) => isFindingInSpecScope(finding, roots, scope))
    .map((finding) => finding.code);
}

function scopeFor(value: string): SpecScope | undefined {
  return resolveSpecScope([value]).scope;
}

async function withTempRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-split-scope-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("QFAI-SPLIT count findings are attributable to a spec scope", () => {
  it("drops a sibling's in-flight spec directory from a scoped run", async () => {
    await withTempRoot(async (root) => {
      await seedCapabilities(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");
      // The sibling agent created its directory but has not appended its CAP row.
      await seedSpec(root, "0004", "CAP-0004");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const specsRoot = resolvePath(root, defaultConfig, "specsDir");
      const extra = issues.find((finding) => finding.code === "QFAI-SPLIT-104");
      expect(extra?.relatedFiles).toEqual([path.join(specsRoot, "spec-0004")]);
      expect(extra?.refs).toEqual(["spec-0004"]);
      expect(issues.find((finding) => finding.code === "QFAI-SPLIT-102")?.relatedFiles).toEqual([
        path.join(specsRoot, "spec-0004"),
      ]);

      const survivors = issues.filter((finding) =>
        isFindingInSpecScope(finding, { root, specsRoot }, scopeFor("0003")),
      );
      expect(survivors).toEqual([]);
      // The invariant `qfai-sdd` sells: a scoped run carries no error that
      // names only a spec the worker does not own.
      expect(
        survivors.filter(
          (finding) => finding.severity === "error" && finding.message.includes("spec-0004"),
        ),
      ).toEqual([]);
    });
  });

  it("keeps the same findings for the spec they name and for an unscoped run", async () => {
    await withTempRoot(async (root) => {
      await seedCapabilities(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");
      await seedSpec(root, "0004", "CAP-0004");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(scopedCodes(issues, root, scopeFor("0004"))).toEqual([
        "QFAI-SPLIT-102",
        "QFAI-SPLIT-104",
      ]);
      expect(scopedCodes(issues, root, undefined)).toEqual(["QFAI-SPLIT-102", "QFAI-SPLIT-104"]);
    });
  });

  it("attributes a missing spec directory to the spec it is missing for", async () => {
    await withTempRoot(async (root) => {
      await seedCapabilities(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const specsRoot = resolvePath(root, defaultConfig, "specsDir");
      expect(issues.find((finding) => finding.code === "QFAI-SPLIT-103")?.relatedFiles).toEqual([
        path.join(specsRoot, "spec-0003"),
      ]);

      expect(scopedCodes(issues, root, scopeFor("0002"))).toEqual([]);
      expect(scopedCodes(issues, root, scopeFor("0003"))).toEqual([
        "QFAI-SPLIT-102",
        "QFAI-SPLIT-103",
      ]);
    });
  });
});

/**
 * True when the temp directory distinguishes `spec-0001/` from `SPEC-0001/`.
 *
 * `SPEC_DIR_RE` matches case-insensitively, so only on such a filesystem can
 * two real directories collapse onto one normalised id. Probed synchronously
 * because `it.skipIf` is evaluated while the suite is being collected.
 */
function tmpdirIsCaseSensitive(): boolean {
  const probe = mkdtempSync(path.join(os.tmpdir(), "qfai-split-case-"));
  try {
    mkdirSync(path.join(probe, "Case"));
    return !existsSync(path.join(probe, "case"));
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
}

describe("QFAI-SPLIT-102 attribution survives a duplicated normalised spec id", () => {
  it.skipIf(!tmpdirIsCaseSensitive())(
    "names both real directories that share one normalised id",
    async () => {
      await withTempRoot(async (root) => {
        await seedCapabilities(root, ["CAP-0001"]);
        await seedSpec(root, "0001", "CAP-0001");
        // Same number, different spelling: two layered packs, one CAP.
        await seedSpec(root, "0001", "CAP-0001", "SPEC-0001");

        const issues = await validateSpecSplitByCapability(root, defaultConfig);
        const specsRoot = resolvePath(root, defaultConfig, "specsDir");
        const count = issues.find((finding) => finding.code === "QFAI-SPLIT-102");
        // Neither missing nor extra — without the duplicate the finding would
        // carry no `relatedFiles` and stay in every `--spec` scope.
        expect([...(count?.relatedFiles ?? [])].sort()).toEqual(
          [path.join(specsRoot, "SPEC-0001"), path.join(specsRoot, "spec-0001")].sort(),
        );

        expect(scopedCodes(issues, root, scopeFor("0001"))).toEqual(["QFAI-SPLIT-102"]);
        expect(scopedCodes(issues, root, scopeFor("0002"))).toEqual([]);
      });
    },
  );
});
