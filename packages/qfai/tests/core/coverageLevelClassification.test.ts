import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { classifyCoverageLevel } from "../../src/core/tddHelpers.js";
import { UNKNOWN_LEVEL_RULE_ID, validateTddList } from "../../src/core/validators/tddList.js";

describe("classifyCoverageLevel", () => {
  it("classifies positively rather than by exclusion", () => {
    expect(classifyCoverageLevel("L1")).toBe("coverage-target");
    expect(classifyCoverageLevel("unit")).toBe("coverage-target");
    expect(classifyCoverageLevel("L3")).toBe("non-coverage");
    expect(classifyCoverageLevel("integration")).toBe("non-coverage");
  });

  it("names the unrecognized case instead of silently including it", () => {
    expect(classifyCoverageLevel("smoke")).toBe("unrecognized");
  });

  it("leaves an undeclared Level to ATDD instead of claiming it too", () => {
    // A blank cell — and a `06_Test-Cases.md` with no `Level` column, which
    // reaches here the same way — is already owned by `QFAI-ATDD-112`:
    // `resolveAtddHomeKind(undefined)` routes it to `tests/integration/**` and
    // keeps the obligation. Answering `coverage-target` here as well put one TC
    // on two gates with two owners and two evidence files.
    expect(classifyCoverageLevel("")).toBe("non-coverage");
    expect(classifyCoverageLevel("   ")).toBe("non-coverage");
  });
});

async function withSpec(
  testCases: string,
  assertion: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-level-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [
        "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |",
        "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |",
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        |",
      ].join("\n"),
      "utf-8",
    );
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const tcTable = (rows: string[]): string =>
  [
    "# 06 Test Cases",
    "",
    "## Test Case Table (required)",
    "",
    "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   | Notes  |",
    "| ------- | ----- | ------- | ------- | ------ | ---------- | ------ |",
    ...rows,
    "",
  ].join("\n");

describe("TDDLIST_TC_NOT_COVERED respects the shipped Level vocabulary", () => {
  it("no longer demands a ledger row for an L3 test case", async () => {
    await withSpec(
      tcTable([
        "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
        "| TC-0002 | L3    | AC-0001 | EX-0001 | step-2 | expected-2 | note-2 |",
      ]),
      (issues) => {
        const missing = issues.filter((entry) => entry.code === "TDDLIST_TC_NOT_COVERED");
        // No finding at all is the claim; naming TC-0002 in the failure output
        // is what makes a regression readable.
        expect(missing.map((entry) => entry.message)).toEqual([]);
      },
    );
  });

  it("still demands one for an L2 test case", async () => {
    await withSpec(
      tcTable([
        "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
        "| TC-0009 | L2    | AC-0001 | EX-0001 | step-9 | expected-9 | note-9 |",
      ]),
      (issues) => {
        const missing = issues.find((entry) => entry.code === "TDDLIST_TC_NOT_COVERED");
        expect(missing?.message).toContain("TC-0009");
      },
    );
  });

  it("warns on an unrecognized Level rather than silently doubling the ledger", async () => {
    await withSpec(
      tcTable(["| TC-0001 | smoke | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |"]),
      (issues) => {
        const finding = issues.find((entry) => entry.code === "TDDLIST_UNKNOWN_LEVEL");
        expect(finding?.severity).toBe("warning");
        expect(finding?.refs).toEqual(["smoke"]);
        // The accepted vocabulary is rendered in the spelling the shipped
        // template uses (`L1`, not the lowercased internal `l1`) and is split
        // into the two groups, since "accepted" alone does not say which
        // values make a TC a mandatory ledger row.
        expect(finding?.message).toContain("Accepted — coverage targets: L1, L2, component, unit;");
        expect(finding?.message).toContain(
          "non-coverage: L3, L4, L5, acceptance, api, e2e, integration, system",
        );
        expect(finding?.message).not.toMatch(/\bl1\b/);
      },
    );
  });

  it("attributes the warning to 06_Test-Cases.md, the file that must be edited", async () => {
    await withSpec(
      tcTable(["| TC-0001 | smoke | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |"]),
      (issues) => {
        const finding = issues.find((entry) => entry.code === "TDDLIST_UNKNOWN_LEVEL");
        // Not tdd/test-list.md: a scope.paths waiver keyed on the ledger would
        // never match the file whose Level cell raised the finding.
        expect(finding?.file).toBe(".qfai/specs/spec-0001/06_Test-Cases.md");
      },
    );
  });

  it("is emitted under a rule id the waiver mechanism can resolve", async () => {
    await withSpec(
      tcTable(["| TC-0001 | smoke | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |"]),
      (issues) => {
        const finding = issues.find((entry) => entry.code === "TDDLIST_UNKNOWN_LEVEL");
        expect(finding?.rule).toBe(UNKNOWN_LEVEL_RULE_ID);
        // `waivers.ts#resolveRuleKeys` resolves this shape and the code; a dotted rule
        // name left a project with its own Level vocabulary no way to waive.
        expect(finding?.rule).toMatch(/^[A-Z]+-\d{3}$/);
        expect(finding?.suggested_action).toContain(".qfai/waivers.yml");
      },
    );
  });

  it("stays quiet on a template-conformant Level set", async () => {
    await withSpec(
      tcTable(["| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |"]),
      (issues) => {
        expect(issues.some((entry) => entry.code === "TDDLIST_UNKNOWN_LEVEL")).toBe(false);
      },
    );
  });
});
