import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { applyWaivers } from "../../src/core/waivers.js";
import { EXCEPTION_PARKED_RULE_ID, validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status    | DR-ID  | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | --------- | ------ | -------- |";

/**
 * A `06_Test-Cases.md` whose table resolves. `resolveTestCaseTable` is
 * section-scoped, so the `## Test Case Table` heading is load-bearing: without
 * it the pack raises TDDLIST_TC_TABLE_UNRESOLVED, which is a warning about the
 * spec pack rather than about the parked row under test.
 */
const TEST_CASE_TABLE = [
  "# 06 Test Cases",
  "",
  "## Test Case Table",
  "",
  "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   |",
  "| ------- | ----- | ------- | ------- | ------ | ---------- |",
  "| TC-0001 | L1    | AC-0001 | EX-0001 | step-1 | expected-1 |",
  "",
].join("\n");

async function withLedger(
  rows: string[],
  assertion: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-exception-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [HEADERS, SEP, ...rows].join("\n"),
      "utf-8",
    );
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const parked = (
  issues: Awaited<ReturnType<typeof validateTddList>>,
): Awaited<ReturnType<typeof validateTddList>> =>
  issues.filter((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED");

describe("parked exception rows are visible in CI", () => {
  it("warns once per exception row, naming the TDD-ID", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001   | anomaly  |",
        "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | exception | DR-2   | anomaly  |",
      ],
      (issues) => {
        expect(parked(issues)).toHaveLength(2);
        expect(parked(issues)[0]?.severity).toBe("warning");
        expect(parked(issues)[0]?.message).toContain("TDD-0001");
        expect(parked(issues)[0]?.message).toContain("`TDDLIST-001` waiver");
        expect(parked(issues)[0]?.message).toContain("(DR-ID DR-0001-0001)");
        expect(parked(issues)[0]?.refs).toEqual(["DR-0001-0001"]);
        // `dl_id` is the only per-finding key `matchesWaiver` compares, so the
        // row identity has to land there for a per-row waiver to be possible.
        expect(parked(issues).map((entry) => entry.dl_id)).toEqual(["TDD-0001", "TDD-0002"]);
      },
    );
  });

  it("keys dl_id per row even when two rows share one DR-ID", async () => {
    // A DR-ID is not row-unique: several parked rows can cite the same decision
    // record. Falling back to it let one `match.dl_ids` entry suppress every row
    // carrying that DR — the over-suppression `dl_id` exists to prevent.
    await withLedger(
      [
        "|          | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001   | anomaly  |",
        "|          | TC-0002 | Unit  | tests/b.test.ts | case b   | exception | DR-0001-0001   | anomaly  |",
      ],
      (issues) => {
        const dlIds = parked(issues).map((entry) => entry.dl_id);
        expect(dlIds).toHaveLength(2);
        expect(new Set(dlIds).size).toBe(2);
        expect(dlIds).not.toContain("DR-0001-0001");
      },
    );
  });

  it("does not call a row-position fallback a TDD-ID", async () => {
    // "list the TDD-ID (row 3)" would send the operator looking for an id the
    // row does not have.
    await withLedger(
      [
        "|          | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001   | anomaly  |",
      ],
      (issues) => {
        const action = parked(issues)[0]?.suggested_action ?? "";
        expect(action).toContain("row identifier");
        expect(action).not.toMatch(/TDD-ID\s*[（(]?row /);
      },
    );
  });

  it("says nothing about non-exception rows", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo      | -      | -        |",
      ],
      (issues) => {
        expect(parked(issues)).toEqual([]);
      },
    );
  });

  it("does not replace the missing-DR error", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception |        | anomaly  |",
      ],
      (issues) => {
        expect(parked(issues)).toHaveLength(1);
        expect(issues.map((entry) => entry.code)).toContain("TDDLIST_EXCEPTION_MISSING_DR");
      },
    );
  });

  it("is emitted under a rule id the waiver mechanism accepts", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001   | anomaly  |",
      ],
      (issues) => {
        const finding = parked(issues)[0];
        expect(finding?.rule).toBe(EXCEPTION_PARKED_RULE_ID);
        // `waivers.ts#resolveRuleId` only accepts this shape; a dotted rule
        // name made an approved accepted risk permanently unwaivable.
        expect(finding?.rule).toMatch(/^[A-Z]+-\d{3}$/);
        expect(finding?.suggested_action).toContain(".qfai/waivers.yml");
      },
    );
  });
});

describe("an approved accepted risk can clear the parked warning", () => {
  /** Builds a spec whose ledger holds `rows`, plus an optional waivers.yml. */
  async function withWaivedLedger(
    rows: string[],
    dlIds: string[] | null,
    assertion: (issues: Awaited<ReturnType<typeof applyWaivers>>["issues"]) => void,
  ): Promise<void> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-exception-waiver-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      for (const file of ["01_Spec.md", "02_User-stories.md", "03_Acceptance-Criteria.md"]) {
        await writeFile(path.join(specDir, file), "# seed\n", "utf-8");
      }
      // A resolvable `## Test Case Table` — otherwise the pack raises
      // TDDLIST_TC_TABLE_UNRESOLVED, an unrelated warning that would make the
      // "no un-suppressed warning remains" assertions below fail for a reason
      // that has nothing to do with waiving the parked row.
      await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASE_TABLE, "utf-8");
      // Declares the DR the parked rows cite. Without it the rows raise
      // TDDLIST_EXCEPTION_UNRESOLVED_DR — correct, but another unrelated
      // warning that would break the "no un-suppressed warning remains"
      // assertions for a reason that is not about waiving the parked row.
      await writeFile(
        path.join(specDir, "07_Decisions.md"),
        "# 07 Decisions\n\n### DR-0001-0001: accepted risk\n",
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [HEADERS, SEP, ...rows].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "waivers.yml"),
        [
          "version: 1",
          "waivers:",
          "  - id: WV-0001",
          `    rule: ${EXCEPTION_PARKED_RULE_ID}`,
          "    reason: accepted risk approved by the operator (DR-0001-0001)",
          "    expires: 2099-12-31",
          "    evidence: .qfai/specs/spec-0001/09_delta.md#DR-0001-0001",
          "    action: suppress",
          ...(dlIds
            ? ["    match:", "      dl_ids:", ...dlIds.map((dlId) => `        - "${dlId}"`)]
            : []),
          "    scope:",
          "      paths:",
          '        - ".qfai/specs/spec-0001/tdd/test-list.md"',
        ].join("\n"),
        "utf-8",
      );

      const findings = await validateTddList(root, defaultConfig);
      assertion((await applyWaivers(root, findings)).issues);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("suppresses the finding through a TDDLIST-001 waiver naming the row", async () => {
    await withWaivedLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001   | anomaly  |",
      ],
      ["TDD-0001"],
      (issues) => {
        const finding = issues.find((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED");
        expect(finding?.suppressed).toBe(true);
        // Suppressed findings are excluded from the counts `--fail-on warning`
        // reads, so the approved parking no longer blocks validation forever.
        expect(issues.filter((entry) => entry.severity === "warning" && !entry.suppressed)).toEqual(
          [],
        );
      },
    );
  });

  it("leaves an unapproved row next to the approved one unsuppressed", async () => {
    // Every row of one ledger shares the rule AND the file, so a waiver matched
    // on rule + scope.paths alone silently closed the parked row nobody
    // approved and `--fail-on warning` went green.
    await withWaivedLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001   | accepted |",
        "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | exception | DR-2   | anomaly  |",
      ],
      ["TDD-0001"],
      (issues) => {
        const parkedFindings = issues.filter((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED");
        expect(parkedFindings.map((entry) => [entry.dl_id, entry.suppressed === true])).toEqual([
          ["TDD-0001", true],
          ["TDD-0002", false],
        ]);
        expect(
          issues.filter((entry) => entry.severity === "warning" && !entry.suppressed).length,
        ).toBeGreaterThan(0);
      },
    );
  });

  it("refuses a path-only waiver with QFAI-WAIVER-005", async () => {
    await withWaivedLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-0001-0001   | accepted |",
        "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | exception | DR-2   | anomaly  |",
      ],
      null,
      (issues) => {
        const rejection = issues.find((entry) => entry.code === "QFAI-WAIVER-005");
        expect(rejection?.severity).toBe("warning");
        expect(rejection?.message).toContain("match.dl_ids");
        // The blanket waiver applies to nothing, so both rows stay visible.
        expect(
          issues
            .filter((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED")
            .every((entry) => entry.suppressed !== true),
        ).toBe(true);
      },
    );
  });
});
