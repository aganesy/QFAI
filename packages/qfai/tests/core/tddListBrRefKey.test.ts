/**
 * `BR-Ref` is the key `/qfai-implement` opens, fills and closes a T1 review
 * group on, and it is an optional column: a ledger seeded before it existed
 * must keep validating unchanged.
 *
 * That optionality is exactly why its *presence* has to be checked. Nothing
 * else in the ledger can contradict the cell, so a mistyped or retired `BR-*`
 * does not fail loudly — it silently regroups rows into a review unit nobody
 * chose. The findings are warnings, like the `DR-ID` referent checks: a ledger
 * written against an older `04_Business-Rules.md` must not start failing CI on
 * upgrade.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const WITH_KEY = `# TDD Execution Ledger

| TDD-ID | TC-Refs | BR-Ref | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ------ | ----- | --------- | -------- | ------ | ----- | -------- |`;

const WITHOUT_KEY = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

const RULES = `# 04 Business Rules

| BR-ID | Title | AC-Refs | Rule |
| ----- | ----- | ------- | ---- |
| BR-0001-0001 | First | AC-0001-0001 | A rule |
`;

async function run(
  ledger: string,
  options: { rules?: string } = {},
): Promise<Array<{ code: string; severity: string; message: string }>> {
  const root = path.join(
    os.tmpdir(),
    `qfai-brref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    if (options.rules !== undefined) {
      await writeFile(path.join(specDir, "04_Business-Rules.md"), options.rules, "utf-8");
    }
    await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger, "utf-8");
    const issues = await validateTddList(root, defaultConfig);
    return issues.map((i) => ({ code: i.code, severity: i.severity, message: i.message }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const row = (brRef: string): string =>
  `| TDD-0001 | TC-0001 | ${brRef} | Unit | tests/a.test.ts | a | todo | - | - |\n`;

describe("the ledger's review-group key is checked when it is declared", () => {
  it("says nothing about a key that names a declared BR", async () => {
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0001")}`, { rules: RULES });
    expect(issues.map((i) => i.code).filter((code) => code.startsWith("TDDLIST_BR_REF"))).toEqual(
      [],
    );
  });

  for (const unresolved of ["-", ""]) {
    it(`treats "${unresolved}" as the legal "not resolved" state`, async () => {
      // The documented degradation: that row is its own group and is reviewed
      // alone. A group of one is a cost, not a defect.
      const issues = await run(`${WITH_KEY}\n${row(unresolved)}`, { rules: RULES });
      expect(issues.map((i) => i.code).filter((code) => code.startsWith("TDDLIST_BR_REF"))).toEqual(
        [],
      );
    });
  }

  for (const malformed of ["BR-1", "BR-0001-0001, BR-0001-0002", "AC-0001-0001"]) {
    it(`reports "${malformed}" as a malformed key`, async () => {
      const issues = await run(`${WITH_KEY}\n${row(malformed)}`, { rules: RULES });
      const finding = issues.find((i) => i.code === "TDDLIST_BR_REF_INVALID");
      expect(finding?.severity).toBe("warning");
      expect(finding?.message).toContain("row 1");
    });
  }

  it("reports a well-formed key that no business rule declares", async () => {
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0009")}`, { rules: RULES });
    const finding = issues.find((i) => i.code === "TDDLIST_BR_REF_UNRESOLVED");
    expect(finding?.severity).toBe("warning");
    expect(finding?.message).toContain("BR-0001-0009");
  });

  it("does not call a key dangling when the spec has no 04_Business-Rules.md", async () => {
    // No rules file cannot contradict the key. Firing there would report every
    // row of a layout that legitimately has no `04`.
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0009")}`);
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BR_REF_UNRESOLVED");
  });

  it("leaves a ledger seeded without the column alone", async () => {
    // The column is optional; its absence is not a finding, and the required
    // set is unchanged.
    const issues = await run(
      `${WITHOUT_KEY}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | todo | - | - |\n`,
      { rules: RULES },
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_REQUIRED_COLUMN_MISSING");
    expect(issues.map((i) => i.code).filter((code) => code.startsWith("TDDLIST_BR_REF"))).toEqual(
      [],
    );
  });
});
