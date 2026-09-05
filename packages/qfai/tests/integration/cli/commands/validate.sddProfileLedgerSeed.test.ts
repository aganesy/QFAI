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

/** A `--spec` run: `/qfai-sdd`'s Phase 2 slice gate, which precedes Phase 2b. */
const SLICE_GATE_REL = ".qfai/report/validate.spec-0001.json";

type ReportedIssue = { code: string; message: string; severity: string };

async function sliceGateIssues(testList: string | undefined): Promise<ReportedIssue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-slice-gate-"));
  try {
    await seedSpec(root, testList);
    await runValidate({ root, strict: false, profile: "sdd", specIds: ["spec-0001"] });
    const body = JSON.parse(await readFile(path.join(root, SLICE_GATE_REL), "utf-8")) as {
      issues: ReportedIssue[];
    };
    return body.issues;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function partialProfileNotice(
  profile: "sdd" | "tdd",
  specIds?: readonly string[],
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-ledger-notice-"));
  try {
    await seedSpec(root);
    await runValidate({ root, strict: false, profile, ...(specIds ? { specIds } : {}) });
    const reportRel = specIds ? SLICE_GATE_REL : CANONICAL_REL;
    const body = JSON.parse(await readFile(path.join(root, reportRel), "utf-8")) as {
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

  it("raises TDDLIST_INVALID_OBLIGATION_REF on a malformed seed-authored obligation", async () => {
    // `US-Refs` is authored with the row, and the drift protocol lets the
    // reader change only Status / DR-ID / Evidence — so a malformed obligation
    // ID it may not repair must fail the stage that wrote it.
    const rows = [
      "| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | todo | - | - | - |",
      "| TDD-0002 | - | E2E | tests/e2e/a.spec.ts | a | todo | - | - | US-1 |",
    ];
    const withUsRefs = [
      "# TDD Execution Ledger",
      "",
      "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | US-Refs |",
      "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ------- |",
      ...rows,
      "",
    ].join("\n");
    expect(await codesFor("sdd", withUsRefs)).toContain("TDDLIST_INVALID_OBLIGATION_REF");
  });

  it("raises TDDLIST_OBLIGATION_LAYER_MISMATCH on an obligation the row's Layer cannot carry", async () => {
    // Which obligations a row carries and the Layer they are legal on are both
    // the seed's, so a `US-*` recorded on a Unit row is seed damage too.
    const mismatched = [
      "# TDD Execution Ledger",
      "",
      "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | US-Refs |",
      "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ------- |",
      "| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | todo | - | - | US-0001 |",
      "",
    ].join("\n");
    expect(await codesFor("sdd", mismatched)).toContain("TDDLIST_OBLIGATION_LAYER_MISMATCH");
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

describe("the slice gate runs before the ledger is seeded", () => {
  /**
   * `/qfai-sdd`'s Required Process gates each Phase 2 slice with
   * `validate --profile sdd --fail-on error --spec <spec-id>` and seeds
   * `tdd/test-list.md` only in the next step, Phase 2b. Reconciling the ledger
   * against `06_Test-Cases.md` at that gate therefore fails by construction on
   * a spec that declares a Unit or Component TC — and it is the gate that has
   * to pass before Phase 2b can run, so the workflow could never reach the
   * phase that would have created the ledger.
   */
  it("does not demand a ledger the next phase has yet to write", async () => {
    const issues = await sliceGateIssues(undefined);
    expect(issues.map((entry) => entry.code)).not.toContain("TDDLIST_TC_NOT_COVERED");
    // `--fail-on error` is what the gate runs with, so nothing about the
    // not-yet-written ledger may reach that severity.
    expect(
      issues.filter((entry) => entry.code.startsWith("TDDLIST_") && entry.severity === "error"),
    ).toEqual([]);
  });

  it("still holds an existing ledger to its shape", async () => {
    // The over-correction pin: only the ledger-vs-test-cases reconciliation is
    // deferred. Everything the ledger text answers on its own still gates the
    // slice, so a slice gate is not a way to smuggle a malformed seed through.
    const row = "| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | todo | - | - |";
    const codes = (await sliceGateIssues(ledger([row, row]))).map((entry) => entry.code);
    expect(codes).toContain("TDDLIST_DUPLICATE_ID");
  });

  it("names the deferred code in the partial-profile notice", async () => {
    // Silence here would claim the slice gate evaluated a code it skipped.
    const scoped = await partialProfileNotice("sdd", ["spec-0001"]);
    expect(scoped).toContain("TDDLIST_TC_NOT_COVERED");
    // …and the unscoped stop gate, which follows Phase 2b, does evaluate it.
    expect(await partialProfileNotice("sdd")).not.toContain("TDDLIST_TC_NOT_COVERED");
  });

  it("reconciles a spec whose ledger does exist, scope or no scope", async () => {
    // `--spec` is documented as a scope filter, so a scoped run is also how an
    // author re-checks one spec *after* Phase 2b. Reading the flag as "we are
    // before Phase 2b" let that run pass with a coverage-target TC unrowed —
    // the exact hole this profile split exists to close, reopened by the
    // deadlock fix. The ledger's presence is the fact; the flag only permits
    // the drop where that fact says the file is not there yet.
    const other = "| TDD-0001 | TC-0002 | Unit | tests/unit/a.test.ts | a | todo | - | - |";
    const codes = (await sliceGateIssues(ledger([other]))).map((entry) => entry.code);
    expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
  });
});

describe("the seed shape covers every cell the seeding phase owns", () => {
  /**
   * All three are `warning`, so none of them blocked `--fail-on error` — but
   * `--strict` / `--fail-on warning` is a documented way to run this gate, and
   * under it a malformed seed passed on the writer's own gate and landed on
   * `/qfai-implement`, which the drift protocol forbids to re-scope a row.
   */
  it("holds the seed to a TC-Refs token that names a declared TC", async () => {
    // `TC-Refs` carries the row's obligation identity, which stays upstream:
    // the reader may not re-point it at a TC that exists.
    const row = "| TDD-0001 | TC-9999 | Unit | tests/unit/a.test.ts | a | todo | - | - |";
    expect(await codesFor("sdd", ledger([row]))).toContain("TDDLIST_UNKNOWN_REF");
  });

  it("holds the seed to a Layer its TC's Level can be discharged by", async () => {
    // `Level` (in `06_Test-Cases.md`) and `Layer` (in the row) are authored by
    // the same phase, and reconciling them is a re-scope — an upstream change.
    const row =
      "| TDD-0001 | TC-0001 | Integration | tests/integration/a.test.ts | a | todo | - | - |";
    expect(await codesFor("sdd", ledger([row]))).toContain("TDDLIST_COVERAGE_LAYER_MISMATCH");
  });

  it("reports the absent ledger Phase 2b's first checklist line creates", async () => {
    expect(await codesFor("sdd", undefined)).toContain("TDDLIST_MISSING");
  });

  it("does not demand that ledger at the gate that precedes Phase 2b", async () => {
    // The other half: `TDDLIST_MISSING` is the file's absence, which is the
    // slice gate's normal state, so it defers with the reconciliation set.
    expect((await sliceGateIssues(undefined)).map((entry) => entry.code)).not.toContain(
      "TDDLIST_MISSING",
    );
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
      "TDDLIST_INVALID_OBLIGATION_REF",
      "TDDLIST_OBLIGATION_LAYER_MISMATCH",
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
