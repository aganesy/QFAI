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
import { RULE_PROMOTIONS } from "../../src/core/sunset.js";
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

/**
 * The two layered spellings of the same pack.
 *
 * `specLayout.ts` decides the style from case-exact filenames and resolves the
 * business-rules file per style, so a fixture that can only be written one way
 * cannot see a validator that hardcodes the other spelling.
 */
const LAYOUT_FILES = {
  v1421: {
    acceptance: "03_Acceptance-Criteria.md",
    testCases: "06_Test-Cases.md",
    rules: "04_Business-Rules.md",
    examples: "05_Examples.md",
  },
  v1417: {
    acceptance: "03_Acceptance-criteria.md",
    testCases: "06_Test-cases.md",
    rules: "04_Business-rules.md",
    examples: "05_Examples-and-scenarios.md",
  },
} as const;

async function run(
  ledger: string,
  options: {
    rules?: string;
    examples?: string;
    testCases?: string;
    layout?: keyof typeof LAYOUT_FILES;
  } = {},
): Promise<Array<{ code: string; severity: string; message: string }>> {
  const root = path.join(
    os.tmpdir(),
    `qfai-brref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  const names = LAYOUT_FILES[options.layout ?? "v1421"];
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      [names.acceptance, "# AC\n"],
      [names.testCases, options.testCases ?? "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    if (options.rules !== undefined) {
      await writeFile(path.join(specDir, names.rules), options.rules, "utf-8");
    }
    if (options.examples !== undefined) {
      await writeFile(path.join(specDir, names.examples), options.examples, "utf-8");
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

/** A row citing the TC the derivation fixtures below declare. */
const keyedRow = (brRef: string, tcRefs = "TC-0001-0004"): string =>
  `| TDD-0001 | ${tcRefs} | ${brRef} | Unit | tests/a.test.ts | a | todo | - | - |\n`;

/** Two rules sharing one AC — the pair the AC-first resolution conflated. */
const DERIVATION_RULES = `# 04 Business Rules

| BR-ID | Title | AC-Refs | Rule |
| ----- | ----- | ------- | ---- |
| BR-0001-0004 | Fourth | AC-0001-0003 | A rule |
| BR-0001-0005 | Fifth | AC-0001-0003 | Another rule |
`;

const derivationExamples = (brRef: string): string => `# 05 Examples

| EX-ID | BR-Ref | Input | Expected |
| ----- | ------ | ----- | -------- |
| EX-0001-0005 | ${brRef} | in | out |
`;

const derivationTestCases = (exRef: string): string => `# 06 Test Cases

| TC-ID | Level | AC-Refs | EX-Ref | Type |
| ----- | ----- | ------- | ------ | ---- |
| TC-0001-0004 | L1 | AC-0001-0003 | ${exRef} | normal |
`;

describe("the ledger's review-group key is checked when it is declared", () => {
  it("says nothing about a key that names a declared BR", async () => {
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0001")}`, { rules: RULES });
    expect(issues.map((i) => i.code).filter((code) => code.startsWith("QFAI-BRREF-"))).toEqual([]);
  });

  for (const unresolved of ["-", ""]) {
    it(`treats "${unresolved}" as the legal "not resolved" state`, async () => {
      // The documented degradation: that row is its own group and is reviewed
      // alone. A group of one is a cost, not a defect.
      const issues = await run(`${WITH_KEY}\n${row(unresolved)}`, { rules: RULES });
      expect(issues.map((i) => i.code).filter((code) => code.startsWith("QFAI-BRREF-"))).toEqual(
        [],
      );
    });
  }

  for (const malformed of ["BR-1", "BR-0001-0001, BR-0001-0002", "AC-0001-0001"]) {
    it(`reports "${malformed}" as a malformed key`, async () => {
      const issues = await run(`${WITH_KEY}\n${row(malformed)}`, { rules: RULES });
      const finding = issues.find((i) => i.code === "QFAI-BRREF-001");
      expect(finding?.severity).toBe("warning");
      expect(finding?.message).toContain("row 1");
    });
  }

  it("reports a well-formed key that no business rule declares", async () => {
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0009")}`, { rules: RULES });
    const finding = issues.find((i) => i.code === "QFAI-BRREF-002");
    expect(finding?.severity).toBe("warning");
    expect(finding?.message).toContain("BR-0001-0009");
  });

  it("accepts the short `BR-NNNN` spelling the shipped templates use", async () => {
    // `templates/specs/spec/04_Business-Rules.md` declares `BR-0001` and
    // `05_Examples.md` points at `BR-0001`, so requiring the compound form made
    // a freshly initialized project illegal by its own example. The same
    // pattern gates the declaration set, so the id was invisible to the
    // resolution check as well — `layerCoverage.ts` has always read these ids
    // with the second segment optional.
    const shortForm = `# 04 Business Rules

| BR-ID | Title | AC-Refs | Rule |
| ----- | ----- | ------- | ---- |
| BR-0001 | First | AC-0001 | A rule |
`;
    const issues = await run(`${WITH_KEY}\n${row("BR-0001")}`, { rules: shortForm });
    expect(issues.map((i) => i.code).filter((code) => code.startsWith("QFAI-BRREF-"))).toEqual([]);
  });

  it("still rejects a short spelling that names no declared rule", async () => {
    // The over-correction pin: widening the shape must not widen what resolves.
    const issues = await run(`${WITH_KEY}\n${row("BR-0009")}`, { rules: RULES });
    expect(issues.find((i) => i.code === "QFAI-BRREF-002")?.message).toContain("BR-0009");
  });

  it("reads declarations from the layout's own business-rules filename", async () => {
    // `specLayout.ts` spells the file `04_Business-Rules.md` only for `v1421`.
    // Joining that fixed name onto the spec dir missed on every other layout,
    // and a miss reads as "no declarations file", which silences the check
    // entirely — a pack whose keys are all wrong looked identical to one whose
    // keys are all right.
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0009")}`, {
      rules: RULES,
      layout: "v1417",
    });
    const finding = issues.find((i) => i.code === "QFAI-BRREF-002");
    expect(finding?.message).toContain("BR-0001-0009");
    // …and it names the file this project actually has, not the v1421 spelling.
    expect(finding?.message).toContain("04_Business-rules.md");
  });

  it("resolves a declared key under that same layout", async () => {
    // The over-correction pin for the line above: reading the right file must
    // not turn every key into an unresolved one.
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0001")}`, {
      rules: RULES,
      layout: "v1417",
    });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-BRREF-002");
  });

  it("collects declarations from the BR-ID column, not from prose or Notes", async () => {
    // A retired or compared-against `BR-*` written into a `Rule` / `Notes`
    // cell, or into the prose around the table, is a mention. Counting it as a
    // declaration lets a `BR-Ref` that the rule table does not declare resolve
    // silently, and the T1 group is keyed on a rule that no longer exists.
    const rules = `# 04 Business Rules

Superseded by BR-0001-0009 during triage; see also BR-0001-0008.

| BR-ID | Title | AC-Refs | Rule | Notes |
| ----- | ----- | ------- | ---- | ----- |
| BR-0001-0001 | First | AC-0001-0001 | A rule | Replaces BR-0001-0007 |
`;
    for (const mentioned of ["BR-0001-0007", "BR-0001-0008", "BR-0001-0009"]) {
      const issues = await run(`${WITH_KEY}\n${row(mentioned)}`, { rules });
      const finding = issues.find((i) => i.code === "QFAI-BRREF-002");
      expect(finding?.message, `${mentioned} resolved against a mention`).toContain(mentioned);
    }
    const declared = await run(`${WITH_KEY}\n${row("BR-0001-0001")}`, { rules });
    expect(declared.map((i) => i.code)).not.toContain("QFAI-BRREF-002");
  });

  it("does not let a table without a `BR-ID` header declare a rule", async () => {
    // A `04_Business-Rules.md` carries auxiliary tables, and the first column
    // of one is exactly where a retired id is written down. Falling back to
    // column 0 when no `BR-ID` header is present put those ids back into the
    // declaration set through the side door — the same silent resolve the
    // prose rule above exists to prevent, and the key would name a rule the
    // file deliberately no longer declares.
    const rules = `# 04 Business Rules

| BR-ID | Title | AC-Refs | Rule |
| ----- | ----- | ------- | ---- |
| BR-0001-0001 | First | AC-0001-0001 | A rule |

## Superseded

| Superseded | Reason |
| ------------ | ------ |
| BR-0001-0009 | Split into BR-0001-0001 |
`;
    const retired = await run(`${WITH_KEY}\n${row("BR-0001-0009")}`, { rules });
    expect(retired.find((i) => i.code === "QFAI-BRREF-002")?.message).toContain("BR-0001-0009");
    // Over-correction pin: the real definition table still declares.
    const declared = await run(`${WITH_KEY}\n${row("BR-0001-0001")}`, { rules });
    expect(declared.map((i) => i.code)).not.toContain("QFAI-BRREF-002");
  });

  it("accepts a rule declared by a `## BR-NNNN-NNNN` heading", async () => {
    // The heading layout `layerCoverage.ts` also walks. Reading only tables
    // would report every key of such a pack as dangling.
    const rules = "# 04 Business Rules\n\n## BR-0001-0002\n\nA rule.\n";
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0002")}`, { rules });
    expect(issues.map((i) => i.code)).not.toContain("QFAI-BRREF-002");
  });

  it("does not call a key dangling when the spec has no 04_Business-Rules.md", async () => {
    // No rules file cannot contradict the key. Firing there would report every
    // row of a layout that legitimately has no `04`.
    const issues = await run(`${WITH_KEY}\n${row("BR-0001-0009")}`);
    expect(issues.map((i) => i.code)).not.toContain("QFAI-BRREF-002");
  });

  it("reports a declared key that is not the one the row's TC-Refs derive", async () => {
    // "Declared" is a weaker claim than "this row's". `TC-0001-0004` is pinned
    // through `EX-0001-0005` to `BR-0001-0005`; the superseded AC-first rule
    // produced `BR-0001-0004`, which exists and shares the AC — so shape and
    // referent both pass while the row is batched under a rule it does not
    // verify, and two rows verifying different rules land in one review unit.
    const options = {
      rules: DERIVATION_RULES,
      examples: derivationExamples("BR-0001-0005"),
      testCases: derivationTestCases("EX-0001-0005"),
    };
    const issues = await run(`${WITH_KEY}\n${keyedRow("BR-0001-0004")}`, options);
    const finding = issues.find((i) => i.code === "QFAI-BRREF-003");
    expect(finding?.severity).toBe("warning");
    expect(finding?.message).toContain("BR-0001-0005");

    // Over-correction pin: the derived key itself is silent.
    const correct = await run(`${WITH_KEY}\n${keyedRow("BR-0001-0005")}`, options);
    expect(correct.map((i) => i.code)).not.toContain("QFAI-BRREF-003");
  });

  it("falls back to the AC join only for a TC with no EX-Ref", async () => {
    // The fallback is per TC, not per row, and its union is both rules sharing
    // `AC-0001-0003` — so the tie-break, not the EX edge, decides.
    const options = {
      rules: DERIVATION_RULES,
      examples: derivationExamples("BR-0001-0005"),
      testCases: derivationTestCases("-"),
    };
    const lowest = await run(`${WITH_KEY}\n${keyedRow("BR-0001-0004")}`, options);
    expect(lowest.map((i) => i.code)).not.toContain("QFAI-BRREF-003");
    const other = await run(`${WITH_KEY}\n${keyedRow("BR-0001-0005")}`, options);
    expect(other.find((i) => i.code === "QFAI-BRREF-003")?.message).toContain(
      "Expected BR-0001-0004",
    );
  });

  it("runs the tie-break over the whole union when one EX names several BRs", async () => {
    // A cohesive rule bundle is legal in one `BR-Ref` cell, so the EX hop is
    // not single-valued. Without the union tie-break the key is ambiguous and
    // two agents reading the same spec derive different ones.
    const options = {
      rules: DERIVATION_RULES,
      examples: derivationExamples("BR-0001-0005, BR-0001-0004"),
      testCases: derivationTestCases("EX-0001-0005"),
    };
    const lowest = await run(`${WITH_KEY}\n${keyedRow("BR-0001-0004")}`, options);
    expect(lowest.map((i) => i.code)).not.toContain("QFAI-BRREF-003");
    const other = await run(`${WITH_KEY}\n${keyedRow("BR-0001-0005")}`, options);
    expect(other.find((i) => i.code === "QFAI-BRREF-003")?.message).toContain(
      "Expected BR-0001-0004",
    );
  });

  it("says nothing about derivation when the layer files reach no rule", async () => {
    // The check contradicts a key only when it can compute one. A spec whose
    // `05` / `06` name nothing, and a row whose cell is the documented "not
    // resolved" state, must both stay silent.
    const bare = await run(`${WITH_KEY}\n${keyedRow("BR-0001-0004")}`, { rules: DERIVATION_RULES });
    expect(bare.map((i) => i.code)).not.toContain("QFAI-BRREF-003");
    for (const unresolved of ["-", ""]) {
      const degraded = await run(`${WITH_KEY}\n${keyedRow(unresolved)}`, {
        rules: DERIVATION_RULES,
        examples: derivationExamples("BR-0001-0005"),
        testCases: derivationTestCases("EX-0001-0005"),
      });
      expect(degraded.map((i) => i.code)).not.toContain("QFAI-BRREF-003");
    }
  });

  it("takes all three severities from the promotion pin, not a literal", async () => {
    // P7: a finding code introduced after the policy ships behind a window, and
    // the window is only real if the severity follows the pin. Warning alone
    // does not prove that — a literal `"warning"` reads the same today and
    // never promotes. The release name in the message is what only the pin can
    // put there, and it is the operator's notice of the debt.
    const promoteAt = RULE_PROMOTIONS.tddListBrRefKey.promoteAt;
    const options = {
      rules: DERIVATION_RULES,
      examples: derivationExamples("BR-0001-0004"),
      testCases: derivationTestCases("EX-0001-0005"),
    };
    const found = [
      // `BR-1` rather than a short-form id: `BR-NNNN` is a legal spelling,
      // so only a genuinely malformed value still trips the format check.
      ...(await run(`${WITH_KEY}\n${keyedRow("BR-1")}`, options)),
      ...(await run(`${WITH_KEY}\n${keyedRow("BR-0404-0404")}`, options)),
      ...(await run(`${WITH_KEY}\n${keyedRow("BR-0001-0005")}`, options)),
    ].filter((i) => i.code.startsWith("QFAI-BRREF-"));

    expect(
      [...new Set(found.map((i) => i.code))].sort(),
      "the fixtures no longer trip all three codes, so the pin below is unproven",
    ).toEqual(["QFAI-BRREF-001", "QFAI-BRREF-002", "QFAI-BRREF-003"]);
    for (const finding of found) {
      expect(finding.severity).toBe("warning");
      expect(
        finding.message,
        `${finding.code} does not name the release ending its window`,
      ).toContain(promoteAt);
    }
  });

  it("leaves a ledger seeded without the column alone", async () => {
    // The column is optional; its absence is not a finding, and the required
    // set is unchanged.
    const issues = await run(
      `${WITHOUT_KEY}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | todo | - | - |\n`,
      { rules: RULES },
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_REQUIRED_COLUMN_MISSING");
    expect(issues.map((i) => i.code).filter((code) => code.startsWith("QFAI-BRREF-"))).toEqual([]);
  });
});
