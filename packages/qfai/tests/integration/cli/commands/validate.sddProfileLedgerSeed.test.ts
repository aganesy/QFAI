/**
 * `--profile sdd` is the only gate `/qfai-sdd` stops on, and it ran no
 * `TDDLIST_*` check at all — while Phase 2b of that same run is what writes
 * `tdd/test-list.md`. A ledger seeded with a duplicate `TDD-ID`, a missing
 * required column or a coverage-target TC with no row left the stage green and
 * only surfaced in `/qfai-implement`, on the one agent the drift protocol
 * forbids to restructure the ledger.
 *
 * These tests pin both halves of the split: the seed shape is now observable
 * from `sdd`, and the execution-state codes still are not — they describe rows
 * `/qfai-implement` has driven, which the SDD stage cannot clear.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";
import { defaultConfig } from "../../../../src/core/config.js";
import { validateTddListSeedShape } from "../../../../src/core/validators/tddList.js";

const CANONICAL_REL = ".qfai/report/validate.json";

const TC_TABLE = [
  "# 06 Test cases",
  "",
  "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |",
  "| ----- | ----- | ------- | ------ | ----- | -------- | ----- |",
  "| TC-0001 | unit | AC-0001 | EX-0001 | step | expected | |",
  "",
].join("\n");

const LEDGER_HEADER = [
  "# TDD Execution Ledger",
  "",
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
  "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
].join("\n");

function ledger(rows: readonly string[]): string {
  return `${LEDGER_HEADER}\n${rows.join("\n")}\n`;
}

/** A spec whose single TC is a coverage target, with an optional ledger. */
async function seedSpec(root: string, testList?: string, specId = "spec-0001"): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", specId);
  await mkdir(specDir, { recursive: true });
  for (const [name, body] of [
    ["01_Spec.md", "# 01 Spec\n"],
    ["02_User-stories.md", "# 02 User stories\n\n## US-0001: title\n- Parent: CAP-0001\n"],
    ["03_Acceptance-Criteria.md", "# 03 Acceptance criteria\n"],
    ["06_Test-Cases.md", TC_TABLE],
  ] as const) {
    await writeFile(path.join(specDir, name), body, "utf-8");
  }
  if (testList !== undefined) {
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "tdd", "test-list.md"), testList, "utf-8");
  }
}

async function codesFor(
  profile: "sdd" | "tdd" | undefined,
  testList: string | undefined,
): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-ledger-seed-"));
  try {
    await seedSpec(root, testList);
    await runValidate(profile ? { root, strict: false, profile } : { root, strict: false });
    const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
      issues: Array<{ code: string; message: string }>;
    };
    return body.issues.map((entry) => entry.code);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function partialProfileNotice(profile: "sdd" | "tdd"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-ledger-notice-"));
  try {
    await seedSpec(root);
    await runValidate({ root, strict: false, profile });
    const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
      issues: Array<{ code: string; message: string }>;
    };
    return body.issues.find((entry) => entry.code === "QFAI-PROFILE-001")?.message ?? "";
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("--profile sdd observes the ledger seed shape it wrote", () => {
  it("raises TDDLIST_TC_NOT_COVERED when Phase 2b seeded no ledger", async () => {
    expect(await codesFor("sdd", undefined)).toContain("TDDLIST_TC_NOT_COVERED");
  });

  it("raises TDDLIST_TABLE_MISSING when the ledger holds no table", async () => {
    const codes = await codesFor("sdd", "# TDD Execution Ledger\n\nno table here\n");
    expect(codes).toContain("TDDLIST_TABLE_MISSING");
  });

  it("raises TDDLIST_DUPLICATE_ID on two rows sharing a TDD-ID", async () => {
    const row = "| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | todo | - | - |";
    expect(await codesFor("sdd", ledger([row, row]))).toContain("TDDLIST_DUPLICATE_ID");
  });

  it("raises TDDLIST_OWNING_MODULE_NOT_SINGULAR on a seed-authored seam", async () => {
    // `Owning module` is filled at Phase 2b from the TC's parent `BR`, so a
    // cell naming two modules is damage the seed owns — holding it to the
    // `tdd` profile alone let the writing stage pass its own gate.
    const seam = [
      "# TDD Execution Ledger",
      "",
      "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Owning module |",
      "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ------------- |",
      "| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | todo | - | - | src/a.ts, src/b.ts |",
      "",
    ].join("\n");
    expect(await codesFor("sdd", seam)).toContain("TDDLIST_OWNING_MODULE_NOT_SINGULAR");
  });

  it("leaves the execution-state codes to --profile tdd", async () => {
    const done = ledger([
      "| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | done | - | - |",
    ]);
    const sddCodes = await codesFor("sdd", done);
    expect(sddCodes).not.toContain("TDDLIST_EVIDENCE_EMPTY");
    expect(sddCodes).not.toContain("TDDLIST_TEST_FILE_MISSING");
    // The same ledger under the profile that owns those rows.
    expect(await codesFor("tdd", done)).toContain("TDDLIST_EVIDENCE_EMPTY");
  });

  it("does not double-report the seed codes under the full profile", async () => {
    const codes = await codesFor(undefined, undefined);
    expect(codes.filter((code) => code === "TDDLIST_TC_NOT_COVERED")).toHaveLength(1);
  });
});

describe("the seed-shape walk honours --spec", () => {
  /**
   * `/qfai-sdd` gates every slice with its own `--spec` run. The run-level
   * scope filter would drop a sibling spec's findings anyway, but only after
   * its ledger had been read and its rows `stat`-ed — quadratic I/O over the
   * spec count. The scope is therefore applied at enumeration, which this
   * asserts against the validator directly, below the CLI's finding filter.
   */
  it("enumerates only the specs in scope", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-ledger-scope-"));
    try {
      await seedSpec(root, undefined, "spec-0001");
      await seedSpec(root, undefined, "spec-0002");
      const scoped = await validateTddListSeedShape(root, defaultConfig, {
        specScope: new Set(["0001"]),
      });
      const files = scoped.map((entry) => entry.file ?? "");
      expect(scoped.map((entry) => entry.code)).toContain("TDDLIST_TC_NOT_COVERED");
      expect(files.some((file) => file.includes("spec-0002"))).toBe(false);
      // Unscoped, both specs are still walked.
      const all = await validateTddListSeedShape(root, defaultConfig);
      expect(all.map((entry) => entry.file ?? "").some((file) => file.includes("spec-0002"))).toBe(
        true,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("the partial-profile notice tracks the split", () => {
  it("stops listing the seed-shape codes as unevaluated under sdd", async () => {
    const message = await partialProfileNotice("sdd");
    expect(message).toContain('profile="sdd" is a partial profile');
    for (const code of [
      "TDDLIST_TC_NOT_COVERED",
      "TDDLIST_DUPLICATE_ID",
      "TDDLIST_OWNING_MODULE_NOT_SINGULAR",
    ]) {
      expect(message).not.toContain(code);
    }
    // The half sdd still does not evaluate stays on the list.
    expect(message).toContain("TDDLIST_* (execution state)");
  });

  it("lists no TDDLIST family under tdd, which runs both halves", async () => {
    expect(await partialProfileNotice("tdd")).not.toContain("TDDLIST_");
  });
});
