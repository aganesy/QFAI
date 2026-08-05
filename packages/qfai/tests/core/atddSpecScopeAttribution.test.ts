/**
 * `--spec` could not scope the two spec-owned ATDD coverage rules.
 *
 * `QFAI-ATDD-111` and `QFAI-ATDD-112` were filed against `specsRoot` itself.
 * `owningSpecNumber` returns `null` for a path that is not inside a
 * `spec-NNNN` directory, and `isPathInSpecScope` treats an unowned path as
 * belonging to every scope — so both findings survived every `--spec` filter.
 * A `/qfai-atdd` run on one spec therefore gated on obligations owned by specs
 * it never touched, and a spec with everything discharged could not close.
 *
 * These tests pin the attribution end to end: the finding names a spec
 * directory, lists the rest under `relatedFiles`, and the real scope filter
 * drops it when the scoped spec is not implicated.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { isFindingInSpecScope, resolveSpecScope } from "../../src/core/specScope.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

type SpecSeed = { specNumber: string; usIds: string[]; tcIds: string[] };

async function seed(root: string, specs: SpecSeed[]): Promise<void> {
  for (const spec of specs) {
    const specDir = path.join(root, ".qfai", "specs", `spec-${spec.specNumber}`);
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      [
        "# 02 User stories",
        "",
        ...spec.usIds.flatMap((id) => [`## ${id}: title`, "- Parent: CAP-0001", ""]),
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        ...spec.tcIds.map((id) => `| ${id} | L3 | AC-0001 | EX-0001 | s | e |`),
        "",
      ].join("\n"),
      "utf-8",
    );
  }
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-scope-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const SPECS: SpecSeed[] = [
  { specNumber: "0001", usIds: ["US-0001"], tcIds: ["TC-0001"] },
  { specNumber: "0002", usIds: ["US-0001"], tcIds: ["TC-0001"] },
];

/** The scope filter `runValidate` applies, over the same roots it builds. */
async function keptUnderScope(root: string, code: string, specIds: string[]): Promise<boolean> {
  const specsRoot = path.join(root, ".qfai", "specs");
  const issues = await validateAtddCodeTraceability(root, defaultConfig);
  const finding = issues.find((entry) => entry.code === code);
  expect(finding).toBeDefined();
  const { scope } = resolveSpecScope(specIds);
  return isFindingInSpecScope(finding ?? {}, { root, specsRoot }, scope);
}

describe.each([
  ["QFAI-ATDD-111", "usToE2e"],
  ["QFAI-ATDD-112", "tcToDeclaredLayer"],
])("%s is attributed to the specs it names", (code) => {
  it("files the finding against a spec directory, not the specs root", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const finding = issues.find((entry) => entry.code === code);

      expect(finding?.file).toBe(path.join(root, ".qfai", "specs", "spec-0001"));
      expect(finding?.relatedFiles).toEqual([path.join(root, ".qfai", "specs", "spec-0002")]);
    });
  });

  it("is kept when the scoped spec is one of the implicated ones", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      expect(await keptUnderScope(root, code, ["0002"])).toBe(true);
    });
  });

  it("is dropped when the scoped spec has discharged its own obligations", async () => {
    // The reported failure: `/qfai-atdd spec-0002` finished everything spec-0002
    // owns and still failed its gate on spec-0001's uncovered obligations.
    await withProject(async (root) => {
      await seed(root, [SPECS[0] as SpecSeed, { specNumber: "0002", usIds: [], tcIds: [] }]);
      expect(await keptUnderScope(root, code, ["0002"])).toBe(false);
    });
  });

  it("still reports everything when no scope is requested", async () => {
    await withProject(async (root) => {
      await seed(root, SPECS);
      expect(await keptUnderScope(root, code, [])).toBe(true);
    });
  });
});
