/**
 * `QFAI-ATDD-112` demanded an annotation a correct project could not give and
 * was categorically forbidden from waiving.
 *
 * `LEVEL_TO_TEST_KIND` had keys for `l3`/`l4`/`l5` and none for `l1`/`l2`, so
 * `resolveTcHomeKind` fell through `?? "integration"` — the fallback meant for
 * a spec with *no* `Level` column — and every declared Unit and Component TC
 * was reported as uncovered in `tests/integration/**`. That directory is not
 * their home: `catalog/test-layers.md` gives L1/L2 no mandated directory and
 * `qfai-atdd/SKILL.md` puts Unit and Component out of its scope.
 *
 * The finding is `error`, and `QFAI-WAIVER-002` refuses every waiver on an
 * `error` rule, so there was no exit. On the repository this was measured on,
 * 263 findings were 255 L1 + 8 L2 with zero L3, against 483 TCs that were all
 * annotated exactly where the layer policy says.
 *
 * L1/L2 are still gated — by `tdd/test-list.md` and `TDDLIST_TC_NOT_COVERED`,
 * under `/qfai-implement`, the stage that owns unit and component tests.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { AtddTestKind } from "../../src/core/atddTraceability.js";
import {
  collectTcLevels,
  isOutsideAtddObligation,
  resolveAtddHomeKind,
} from "../../src/core/atddTraceability.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../../src/core/atdd/scaffold.js";
import { defaultConfig } from "../../src/core/config.js";
import { classifyCoverageLevel, UNIT_COMPONENT_LAYERS } from "../../src/core/tddHelpers.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";
import { validateScaffoldPlaceholder } from "../../src/core/validators/scaffoldPlaceholder.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

type Tc = { id: string; level: string };

async function withProject(
  tcs: Tc[],
  testFiles: Record<string, string>,
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-unit-scope-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        ...tcs.map((tc) => `| ${tc.id} | ${tc.level} | AC-0001 | EX-0001 | s | e |`),
        "",
      ].join("\n"),
      "utf-8",
    );
    for (const [rel, body] of Object.entries(testFiles)) {
      const file = path.join(root, ...rel.split("/"));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = (issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>): string[] =>
  issues.map((entry) => entry.code);

describe("Unit and Component carry no ATDD annotation obligation", () => {
  it.each(["L1", "unit", "L2", "component"])(
    "does not demand an annotation for a %s TC",
    async (level) => {
      await withProject([{ id: "TC-0001", level }], {}, async (root) => {
        expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
          "QFAI-ATDD-112",
        );
      });
    },
  );

  it("still demands one for L3, which ATDD does own", async () => {
    await withProject([{ id: "TC-0001", level: "L3" }], {}, async (root) => {
      expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).toContain(
        "QFAI-ATDD-112",
      );
    });
  });

  it("keeps the no-Level default at tests/integration/**", async () => {
    // The `?? "integration"` fallback is for a spec with no `Level` column and
    // must not move; only the L1/L2 case was ever wrong.
    await withProject([{ id: "TC-0001", level: "" }], {}, async (root) => {
      expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).toContain(
        "QFAI-ATDD-112",
      );
    });
  });

  it("reports the exclusion at info instead of dropping it silently", async () => {
    // A silent exclusion is indistinguishable from a scan that found nothing —
    // the shape that let the JS-only test glob defect survive a release.
    await withProject(
      [
        { id: "TC-0001", level: "L1" },
        { id: "TC-0002", level: "L2" },
        { id: "TC-0003", level: "L3" },
      ],
      {},
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        const excluded = issues.find((entry) => entry.code === "QFAI-ATDD-117");

        expect(excluded?.severity).toBe("info");
        expect(excluded?.refs).toEqual(["SPEC-0001:TC-0001", "SPEC-0001:TC-0002"]);
        expect(excluded?.suggested_action).toContain("TDDLIST_TC_NOT_COVERED");

        // The L3 sibling is still owed, and is the only one named.
        const missing = issues.find((entry) => entry.code === "QFAI-ATDD-112");
        expect(missing?.refs).toEqual(["SPEC-0001:TC-0003"]);
      },
    );
  });

  it("does not call an L1 annotation inside a scanned directory forbidden", async () => {
    // The routing rule and the forbidden rule have to agree. Reporting the
    // annotation as misplaced while also not counting it is the two-errors-from
    // -one-action shape #217 removed for L4; L1/L2 must not reintroduce it.
    await withProject(
      [{ id: "TC-0001", level: "L1" }],
      { "tests/integration/spec_0001/tc-0001.test.ts": "# QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const found = codes(await validateAtddCodeTraceability(root, defaultConfig));
        expect(found).not.toContain("QFAI-ATDD-112");
        expect(found).not.toContain("QFAI-ATDD-123");
      },
    );
  });

  it("keeps the exclusion visible in the summary artifact, not only in the findings", async () => {
    // `missing.tc: []` alone reads as "every TC is covered by ATDD" to anyone
    // auditing `report/atdd-traceability/summary.*` in CI. The `deferred` key
    // exists for exactly this reason; the exclusion needs the same treatment.
    await withProject(
      [
        { id: "TC-0001", level: "L1" },
        { id: "TC-0002", level: "L3" },
      ],
      { "tests/integration/spec_0001/tc-0002.test.ts": "// QFAI:SPEC-0001:TC-0002\n" },
      async (root) => {
        await validateAtddCodeTraceability(root, defaultConfig);
        const summary = JSON.parse(
          await readFile(
            path.join(root, ".qfai", "report", "atdd-traceability", "summary.json"),
            "utf-8",
          ),
        ) as { missing: { tc: string[] }; excludedUnitComponentTc: string[] };

        expect(summary.missing.tc).toEqual([]);
        expect(summary.excludedUnitComponentTc).toEqual(["SPEC-0001:TC-0001"]);

        const markdown = await readFile(
          path.join(root, ".qfai", "report", "atdd-traceability", "summary.md"),
          "utf-8",
        );
        expect(markdown).toContain("declared Level Unit/Component");
        expect(markdown).toContain("SPEC-0001:TC-0001");
      },
    );
  });

  it("says nothing at all when a project declares no Unit or Component TC", async () => {
    await withProject(
      [{ id: "TC-0001", level: "L3" }],
      { "tests/integration/spec_0001/tc-0001.test.ts": "# QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const found = codes(await validateAtddCodeTraceability(root, defaultConfig));
        expect(found).not.toContain("QFAI-ATDD-117");
        expect(found).not.toContain("QFAI-ATDD-112");
      },
    );
  });

  it.each([
    ["L4", "tests/api/**"],
    ["L5", "tests/e2e/**"],
  ])("leaves the %s route exactly where it was", async (level, home) => {
    // The exclusion is two `Level` values wide. L4 and L5 keep routing to the
    // directory they routed to before it, named in the finding as before —
    // pinned here because a widening that swallowed them would still leave
    // every other assertion in this file green.
    await withProject([{ id: "TC-0001", level }], {}, async (root) => {
      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const missing = issues.find((entry) => entry.code === "QFAI-ATDD-112");

      expect(missing?.refs).toEqual(["SPEC-0001:TC-0001"]);
      expect(missing?.message).toContain(home);
      expect(codes(issues)).not.toContain("QFAI-ATDD-117");
    });
  });
});

describe("a multi-valued Level cell is not an exit from the gate", () => {
  // `catalog/test-layers.md` calls a multi-valued cell (`L3/L5`) illegal and
  // says no validator can route it. "Cannot route" must resolve to the
  // conservative answer — keep the obligation at the `integration` default and
  // report it — never to the permissive one. If a cell qfai does not
  // understand silently discharged the obligation, `L1/L2` would be a
  // one-keystroke way to delete any TC from the gate, and the exclusion built
  // here would be the thing that made it possible.
  it.each(["L3/L5", "L1/L2", "L1/L3", "L1, L3"])(
    "keeps %s owed rather than treating it as excluded",
    async (level) => {
      await withProject([{ id: "TC-0001", level }], {}, async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);

        // Owed, and owed at the documented no-answer default.
        const missing = issues.find((entry) => entry.code === "QFAI-ATDD-112");
        expect(missing?.refs).toEqual(["SPEC-0001:TC-0001"]);
        expect(missing?.message).toContain("tests/integration/**");

        // Not reported as excluded: the exclusion applies to a cell that
        // declares exactly Unit or exactly Component, nothing that merely
        // contains the word.
        expect(codes(issues)).not.toContain("QFAI-ATDD-117");
      });
    },
  );

  it("still discharges the multi-valued TC from tests/integration/**", async () => {
    // The obligation the previous case keeps has to be satisfiable, or the
    // conservative reading just moves the unclearable-error defect to a new
    // input instead of removing it.
    await withProject(
      [{ id: "TC-0001", level: "L3/L5" }],
      { "tests/integration/spec_0001/tc-0001.test.ts": "# QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const found = codes(await validateAtddCodeTraceability(root, defaultConfig));
        expect(found).not.toContain("QFAI-ATDD-112");
        expect(found).not.toContain("QFAI-ATDD-123");
      },
    );
  });

  it("excludes a Unit cell that only differs by surrounding whitespace", async () => {
    // The complement of the case above: the exclusion must not be so literal
    // that ` L1 ` — which every markdown table writes — falls out of it.
    await withProject([{ id: "TC-0001", level: " L1 " }], {}, async (root) => {
      expect(codes(await validateAtddCodeTraceability(root, defaultConfig))).not.toContain(
        "QFAI-ATDD-112",
      );
    });
  });
});

describe("the replacement gate reads the same tables ATDD does", () => {
  it("demands a ledger row for an L1 TC declared in a second table", async () => {
    // `atddTraceability#collectTableTcLevels` iterates every markdown table;
    // `collectTestCaseIds` read only the first `TC-ID` table. A spec that
    // splits `06_Test-Cases.md` per BR therefore had L1 TCs that ATDD saw and
    // the ledger gate did not — survivable while both rules demanded
    // something, and a silent hole once L1/L2 left `QFAI-ATDD-112`.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-multitable-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      for (const [name, body] of [
        ["01_Spec.md", "# Spec\n"],
        ["02_User-stories.md", "# US\n"],
        ["03_Acceptance-Criteria.md", "# AC\n"],
      ] as const) {
        await writeFile(path.join(specDir, name), body, "utf-8");
      }
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "### BR-0001",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | EX-0001 | s | e |",
          "",
          "### BR-0002",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0002 | L1 | AC-0002 | EX-0002 | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | case a | todo | - | - |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateTddList(root, defaultConfig);
      const notCovered = issues.find((entry) => entry.code === "TDDLIST_TC_NOT_COVERED");
      // TC-0002 lives in the second table and has no ledger row.
      expect(notCovered?.message).toContain("TC-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("the replacement gate has no holes the exclusion could fall through", () => {
  async function withSpec(files: Record<string, string>, task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gate-holes-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      for (const [rel, body] of Object.entries(files)) {
        const file = path.join(specDir, ...rel.split("/"));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, body, "utf-8");
      }
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const table = (rows: string) =>
    [
      "# 06 Test Cases",
      "",
      "## Test Case Table",
      "",
      "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
      "| ----- | ----- | ------- | ------ | ----- | -------- |",
      rows,
      "",
    ].join("\n");

  it("errors when the ledger is absent and the spec declares coverage-target TCs", async () => {
    // `TDDLIST_MISSING` is a warning and returned early, so a spec with L1 TCs,
    // no tests and no ledger passed `--fail-on error` on an `info` alone.
    await withSpec(
      { "06_Test-Cases.md": table("| TC-0001 | L1 | AC-0001 | - | s | e |") },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        const notCovered = issues.find((entry) => entry.code === "TDDLIST_TC_NOT_COVERED");
        expect(notCovered?.severity).toBe("error");
        expect(notCovered?.message).toContain("TC-0001");
      },
    );
  });

  it("says in the warning itself that the ledger is no longer optional here", async () => {
    // The escalation above is real and deliberate, and `TDDLIST_MISSING` is the
    // finding an operator reads first. While it said the file was "optional for
    // older specs" the accompanying `error` was discoverable only by CI going
    // red — a promise the same function breaks one statement later.
    await withSpec(
      { "06_Test-Cases.md": table("| TC-0001 | L1 | AC-0001 | - | s | e |") },
      async (root) => {
        const missing = (await validateTddList(root, defaultConfig)).find(
          (entry) => entry.code === "TDDLIST_MISSING",
        );
        expect(missing?.severity).toBe("warning");
        expect(missing?.message).toContain("coverage-target TC");
        expect(missing?.suggested_action).toContain("TDDLIST_TC_NOT_COVERED");
      },
    );
  });

  it("adds advice to these findings without moving their JSON category", async () => {
    // `category` splits `qfai report` into its Canonical and Change sections
    // and is emitted verbatim into `validate.json`, so a consumer can key on
    // it. Both findings here gained a `suggested_action`, which sits behind
    // `category` in `issue()`'s positional list — the slot has to be spelled
    // out, and spelling it differently would ship an output change this PR
    // does not announce. `TDDLIST_TC_NOT_COVERED` also has a second call site
    // for the file-present path; one rule code must not report two categories.
    await withSpec(
      { "06_Test-Cases.md": table("| TC-0001 | L1 | AC-0001 | - | s | e |") },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        for (const code of ["TDDLIST_MISSING", "TDDLIST_TC_NOT_COVERED"]) {
          const found = issues.find((entry) => entry.code === code);
          expect(found?.category, code).toBe("canonical");
          expect(found?.suggested_action, code).toBeTruthy();
        }
      },
    );
  });

  it("keeps the ledger optional for a spec that declares no coverage-target TC", async () => {
    // The other half of the same promise: the escalation is conditional, so a
    // spec whose TCs are all L3 keeps the warning and gains no error.
    await withSpec(
      { "06_Test-Cases.md": table("| TC-0001 | L3 | AC-0001 | - | s | e |") },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.map((entry) => entry.code)).toEqual(["TDDLIST_MISSING"]);
        expect(issues[0]?.severity).toBe("warning");
      },
    );
  });

  it("names a multi-valued Level cell and still owes it a ledger row", async () => {
    // `catalog/test-layers.md` states both halves of what happens to a cell no
    // vocabulary matches: `QFAI-ATDD-112` routes it to the no-`Level` default
    // (pinned above) and the ledger side names it at `warning` while keeping it
    // a coverage target. Nothing normalizes it to one of its own values — the
    // reading a downstream project recorded as a fact about `L3/L5`.
    await withSpec(
      {
        "06_Test-Cases.md": table("| TC-0001 | L3/L5 | AC-0001 | - | s | e |"),
        "tdd/test-list.md": [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        const unknown = issues.find((entry) => entry.code === "TDDLIST_UNKNOWN_LEVEL");
        expect(unknown?.severity).toBe("warning");
        expect(unknown?.refs).toEqual(["L3/L5"]);
        expect(issues.find((entry) => entry.code === "TDDLIST_TC_NOT_COVERED")?.message).toContain(
          "TC-0001",
        );
      },
    );
  });

  it("covers a heading-form TC, which the table reader never saw", async () => {
    await withSpec(
      {
        "06_Test-Cases.md": ["# 06 Test Cases", "", "## TC-0001", "", "- Level: L1", ""].join("\n"),
        "tdd/test-list.md": [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.find((e) => e.code === "TDDLIST_TC_NOT_COVERED")?.message).toContain(
          "TC-0001",
        );
      },
    );
  });

  it("knows a heading-form TC that declares no Level", async () => {
    // Seeding the known set from the level pairs alone made a level-less
    // heading block undeclared, so its own ledger row became an unknown
    // reference. `- Level:` is optional; the heading is what declares the TC.
    await withSpec(
      {
        "06_Test-Cases.md": [
          "# 06 Test Cases",
          "",
          "## TC-0001: no level here",
          "",
          "- AC-Refs: AC-0001",
          "",
          "## TC-0002",
          "",
          "- Level: L1",
          "",
        ].join("\n"),
        "tdd/test-list.md": [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | todo | - | - |",
          "| TDD-0002 | TC-0002 | unit | tests/b.test.ts | b | todo | - | - |",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.filter((e) => e.code === "TDDLIST_UNKNOWN_REF")).toEqual([]);
        expect(issues.filter((e) => e.code === "TDDLIST_TC_NOT_COVERED")).toEqual([]);
      },
    );
  });

  it("counts coverage from every ledger table, not just the first", async () => {
    // `/qfai-implement` appends a per-change-request section with its own
    // table. Scoring against table 1 alone reported every TC the later tables
    // cover as uncovered — an `error` on a correct ledger.
    await withSpec(
      {
        "06_Test-Cases.md": table(
          ["| TC-0001 | L1 | AC-0001 | - | s | e |", "| TC-0002 | L1 | AC-0001 | - | s | e |"].join(
            "\n",
          ),
        ),
        "tdd/test-list.md": [
          "# TDD Execution Ledger",
          "",
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | todo | - | - |",
          "",
          "## CHG-001 second wave",
          "",
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "| TDD-0002 | TC-0002 | unit | tests/b.test.ts | b | todo | - | - |",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.filter((e) => e.code === "TDDLIST_TC_NOT_COVERED")).toEqual([]);
      },
    );
  });

  it("still refuses to let a later E2E table clear a coverage-target TC", async () => {
    // Widening the scan to every table must not widen what counts: a `TC-*` on
    // an E2E row is a forbidden placement wherever the row lives.
    await withSpec(
      {
        "06_Test-Cases.md": table("| TC-0001 | L1 | AC-0001 | - | s | e |"),
        "tdd/test-list.md": [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "| TDD-0001 | - | unit | tests/a.test.ts | a | todo | - | - |",
          "",
          "## CHG-001 second wave",
          "",
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "| TDD-0002 | TC-0001 | e2e | tests/e2e/b.test.ts | b | todo | - | - |",
          "",
        ].join("\n"),
      },
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.find((e) => e.code === "TDDLIST_TC_NOT_COVERED")?.message).toContain(
          "TC-0001",
        );
      },
    );
  });
});

describe("a commented-out table cannot suppress a real obligation", () => {
  it("ignores a Level declared inside an HTML comment", async () => {
    // First-declaration-wins over unmasked text meant a stale commented table
    // saying `L1` removed the live row's QFAI-ATDD-112 obligation entirely.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-masked-level-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      for (const [name, body] of [
        ["01_Spec.md", "# Spec\n"],
        ["02_User-stories.md", "# US\n"],
        ["03_Acceptance-Criteria.md", "# AC\n"],
      ] as const) {
        await writeFile(path.join(specDir, name), body, "utf-8");
      }
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "<!--",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "-->",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L3 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const codes2 = (await validateAtddCodeTraceability(root, defaultConfig)).map((e) => e.code);
      expect(codes2).toContain("QFAI-ATDD-112");
      expect(codes2).not.toContain("QFAI-ATDD-117");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("the two collectors agree on which tables are authoritative", () => {
  async function withTcFile(body: string, task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tc-tables-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      for (const [name, content] of [
        ["01_Spec.md", "# Spec\n"],
        ["02_User-stories.md", "# US\n"],
        ["03_Acceptance-Criteria.md", "# AC\n"],
        ["06_Test-Cases.md", body],
      ] as const) {
        await writeFile(path.join(specDir, name), content, "utf-8");
      }
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("ignores an illustrative table above the authoritative section", async () => {
    // First-declaration-wins over every table in the document meant a format
    // example saying `TC-0001 | L1` excluded the TC from QFAI-ATDD-112, while
    // the section-scoped ledger gate read the real `L3` row and did not claim
    // it either — full validation passed with no test at all.
    await withTcFile(
      [
        "# 06 Test Cases",
        "",
        "## How to fill this in",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L3 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.map((entry) => entry.code)).toContain("QFAI-ATDD-112");
        expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-117");
      },
    );
  });

  it("leaves a mistyped TC-ID header owed by both gates, not neither", async () => {
    // `hasTcIdColumn` is case-sensitive so a mistyped column surfaces as a
    // failure (`testCaseTableResolution.test.ts` pins that). The hole was that
    // the ATDD collector read every table directly and so still saw the `L1`,
    // excluding the TC from `QFAI-ATDD-112` while `validateTddList` reported
    // `TDDLIST_TC_TABLE_UNRESOLVED` and skipped coverage. Reading through
    // `resolveTestCaseTables` makes both gates see the same tables: the ledger
    // says it cannot read the catalogue, and ATDD keeps the default
    // obligation. Fixing the header clears both.
    const doc = [
      "# 06 Test Cases",
      "",
      "## Test Case Table",
      "",
      "| tc-id | level | AC-Refs | EX-Ref | Steps | Expected |",
      "| ----- | ----- | ------- | ------ | ----- | -------- |",
      "| TC-0001 | L1 | AC-0001 | - | s | e |",
      "",
    ].join("\n");
    await withTcFile(doc, async (root) => {
      const tddDir = path.join(root, ".qfai", "specs", "spec-0001", "tdd");
      await mkdir(tddDir, { recursive: true });
      await writeFile(
        path.join(tddDir, "test-list.md"),
        [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const ledger = (await validateTddList(root, defaultConfig)).map((entry) => entry.code);
      expect(ledger).toContain("TDDLIST_TC_TABLE_UNRESOLVED");

      const atdd = (await validateAtddCodeTraceability(root, defaultConfig)).map(
        (entry) => entry.code,
      );
      expect(atdd).toContain("QFAI-ATDD-112");
      expect(atdd).not.toContain("QFAI-ATDD-117");
    });
  });
});

describe("a declared Level names the layer that discharges it", () => {
  async function withSpecAndLedger(
    level: string,
    layer: string,
    task: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
  ) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-level-layer-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          `| TC-0001 | ${level} | AC-0001 | - | s | e |`,
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          `| TDD-0001 | TC-0001 | ${layer} | tests/a.test.ts | a | todo | - | - |`,
          "",
        ].join("\n"),
        "utf-8",
      );
      task(await validateTddList(root, defaultConfig));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("reports an L1 TC discharged only from an Integration row", async () => {
    // Coverage counted any non-API/E2E row, so an L1 TC closed on an
    // integration test alone — and since L1/L2 no longer owe QFAI-ATDD-112
    // either, nothing else asked for the unit test.
    await withSpecAndLedger("L1", "integration", (issues) => {
      const mismatch = issues.find((e) => e.code === "TDDLIST_COVERAGE_LAYER_MISMATCH");
      expect(mismatch?.message).toContain("TC-0001");
      expect(mismatch?.message).toContain("Layer=INTEGRATION");
      expect(mismatch?.severity).toBe("warning");
      // Still counted as covered — the mismatch is the finding, not a second
      // "not covered" on the same row.
      expect(issues.map((e) => e.code)).not.toContain("TDDLIST_TC_NOT_COVERED");
    });
  });

  it.each([
    ["L1", "unit"],
    ["unit", "unit"],
    ["L2", "component"],
    ["component", "component"],
  ])("accepts a %s TC on a %s row", async (level, layer) => {
    await withSpecAndLedger(level, layer, (issues) => {
      expect(issues.map((e) => e.code)).not.toContain("TDDLIST_COVERAGE_LAYER_MISMATCH");
    });
  });

  it("says nothing when the TC declared no Level", async () => {
    // An absent Level is the fallback-to-everything case; it makes no claim
    // about layer, so no row can contradict it.
    await withSpecAndLedger("", "integration", (issues) => {
      expect(issues.map((e) => e.code)).not.toContain("TDDLIST_COVERAGE_LAYER_MISMATCH");
    });
  });

  it("says nothing when the row's Layer is outside the vocabulary", async () => {
    // `TDDLIST_UNKNOWN_LAYER` already names that typo; a second finding
    // blaming the crosswalk would send the author at the wrong file.
    await withSpecAndLedger("L1", "smoke", (issues) => {
      expect(issues.map((e) => e.code)).not.toContain("TDDLIST_COVERAGE_LAYER_MISMATCH");
    });
  });
});

describe("only real ledger rows count as coverage", () => {
  async function withLedger(ledger: string, task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-rows-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger, "utf-8");
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const HEADER = [
    "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
  ];

  it("does not count a row inside a fenced template", async () => {
    // `parseAllMarkdownTables` read the raw file, so a copy-paste template in
    // the ledger cleared the only error that still owes an L1 TC.
    await withLedger(
      [
        ...HEADER,
        "",
        "```md",
        ...HEADER,
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | todo | - | - |",
        "```",
        "",
      ].join("\n"),
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.find((e) => e.code === "TDDLIST_TC_NOT_COVERED")?.message).toContain(
          "TC-0001",
        );
      },
    );
  });

  it("does not count a row inside an HTML comment", async () => {
    await withLedger(
      [
        ...HEADER,
        "",
        "<!--",
        ...HEADER,
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | todo | - | - |",
        "-->",
        "",
      ].join("\n"),
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.find((e) => e.code === "TDDLIST_TC_NOT_COVERED")?.message).toContain(
          "TC-0001",
        );
      },
    );
  });

  it("does not count a later table that is not a ledger table", async () => {
    // A stray table carrying only `TC-Refs` sits outside every schema, Layer
    // and unknown-ref check the first table passes, so counting it made
    // "covered" mean something weaker than "has a row".
    await withLedger(
      [...HEADER, "", "## Notes", "", "| TC-Refs |", "| ------- |", "| TC-0001 |", ""].join("\n"),
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.find((e) => e.code === "TDDLIST_TC_NOT_COVERED")?.message).toContain(
          "TC-0001",
        );
      },
    );
  });

  it("still counts a later table that carries the ledger schema", async () => {
    await withLedger(
      [
        ...HEADER,
        "",
        "## CHG-001 second wave",
        "",
        ...HEADER,
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | todo | - | - |",
        "",
      ].join("\n"),
      async (root) => {
        const issues = await validateTddList(root, defaultConfig);
        expect(issues.map((e) => e.code)).not.toContain("TDDLIST_TC_NOT_COVERED");
      },
    );
  });
});

describe("a heading TC that declares no Level is owed by ATDD, not by the ledger", () => {
  async function withSpec(files: Record<string, string>, task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-levelless-heading-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      // The ATDD scan enumerates specs, so the pack has to look like one.
      for (const [name, body] of [
        ["01_Spec.md", "# Spec\n"],
        ["02_User-stories.md", "# US\n"],
        ["03_Acceptance-Criteria.md", "# AC\n"],
      ] as const) {
        await writeFile(path.join(specDir, name), body, "utf-8");
      }
      for (const [rel, body] of Object.entries(files)) {
        const file = path.join(specDir, ...rel.split("/"));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, body, "utf-8");
      }
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const HEADING_SPEC = [
    "# 06 Test Cases",
    "",
    "## TC-0001: no level",
    "",
    "- AC-Refs: AC-0001",
    "",
  ].join("\n");

  const LEDGER = [
    "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
    "",
  ].join("\n");

  it("keeps the QFAI-ATDD-112 obligation, so it is not owed by nothing", async () => {
    // The L1/L2 exclusion is what moved a TC's gate to the ledger. An absent
    // `Level` is not L1/L2: `resolveTcHomeKind` still routes it to
    // `tests/integration/**` — the default this PR deliberately did not move —
    // so ATDD owns it and the ledger is not its gate.
    await withSpec({ "06_Test-Cases.md": HEADING_SPEC }, async (root) => {
      const codes = (await validateAtddCodeTraceability(root, defaultConfig)).map((e) => e.code);
      expect(codes).toContain("QFAI-ATDD-112");
      expect(codes).not.toContain("QFAI-ATDD-117");
    });
  });

  it("is a known reference, so its ledger row is not reported as unknown", async () => {
    await withSpec(
      {
        "06_Test-Cases.md": HEADING_SPEC,
        "tdd/test-list.md": [
          LEDGER.trimEnd(),
          "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | todo | - | - |",
          "",
        ].join("\n"),
      },
      async (root) => {
        const codes = (await validateTddList(root, defaultConfig)).map((e) => e.code);
        expect(codes).not.toContain("TDDLIST_UNKNOWN_REF");
      },
    );
  });
});

describe("a later ledger table only counts its real rows", () => {
  async function run(ledgerBody: string): Promise<string[]> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-rows2-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(path.join(specDir, "tdd", "test-list.md"), ledgerBody, "utf-8");
      return (await validateTddList(root, defaultConfig)).map((entry) => entry.code);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const HEADER = [
    "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
  ];

  it("ignores a row with no TDD-ID under a schema-shaped header", async () => {
    // Requiring the header alone was not enough: a line that fills `TC-Refs`
    // and leaves `TDD-ID`, `Layer` and `Test file` blank cleared the
    // obligation, and the blank `Layer` also slipped past the E2E/API
    // exclusion and the Level/Layer crosswalk.
    const codes = await run(
      [...HEADER, "", "## Notes", "", ...HEADER, "|  | TC-0001 |  |  |  |  |  |  |", ""].join("\n"),
    );
    expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
  });

  it("still counts a complete row in the later table", async () => {
    const codes = await run(
      [
        ...HEADER,
        "",
        "## CHG-001",
        "",
        ...HEADER,
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | todo | - | - |",
        "",
      ].join("\n"),
    );
    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
  });
});

describe("a row is checked the same wherever in the ledger it sits", () => {
  // Widening the coverage reader to every ledger table left the row checks on
  // the first one, so an identical row was diagnosed in table 1 and passed in
  // silence in table 2 — while clearing `TDDLIST_TC_NOT_COVERED` from both.
  // The only gate an L1/L2 TC has left became a claim that a meaningless cell
  // could falsify with nothing on screen to say so.
  async function run(ledgerBody: string) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-symmetry-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(path.join(specDir, "tdd", "test-list.md"), ledgerBody, "utf-8");
      return await validateTddList(root, defaultConfig);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const HEADER = [
    "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
  ];
  const FILLER = "| TDD-0001 | - | unit | tests/a.test.ts | a | todo | - | - |";

  const inFirstTable = (row: string): string => [...HEADER, row, ""].join("\n");
  const inLaterTable = (row: string): string =>
    [...HEADER, FILLER, "", "## CHG-001", "", ...HEADER, row, ""].join("\n");

  it("reports an unknown Layer in a later table, not only in the first", async () => {
    const row = "| TDD-0002 | TC-0001 | bogus | tests/b.test.ts | b | todo | - | - |";
    const later = (await run(inLaterTable(row))).filter(
      (entry) => entry.code === "TDDLIST_UNKNOWN_LAYER",
    );

    expect(later).toHaveLength(1);
    expect(later[0]?.severity).toBe("warning");
    expect(later[0]?.message).toContain('Unknown Layer "bogus"');
    // The row index is per table, so the table has to be named or `row 1`
    // points at a different row than the one that carries the typo.
    expect(later[0]?.message).toContain("table 2, row 1");
  });

  it.each([
    [
      "TDDLIST_UNKNOWN_LAYER",
      "| TDD-0002 | TC-0001 | bogus | tests/b.test.ts | b | todo | - | - |",
    ],
    ["TDDLIST_INVALID_ID", "| nope | TC-0001 | unit | tests/b.test.ts | b | todo | - | - |"],
    [
      "TDDLIST_OBLIGATION_LAYER_MISMATCH",
      "| TDD-0002 | TC-0001 | e2e | tests/e2e/b.test.ts | b | todo | - | - |",
    ],
  ])("raises %s for the same row in either table", async (code, row) => {
    const first = (await run(inFirstTable(row))).filter((entry) => entry.code === code);
    const later = (await run(inLaterTable(row))).filter((entry) => entry.code === code);

    expect(first).toHaveLength(1);
    expect(later).toHaveLength(1);
    expect(later[0]?.severity).toBe(first[0]?.severity);
  });

  it("leaves the first table's own row label unchanged", async () => {
    // A one-table ledger is the common case; naming a table it does not have
    // would churn every existing message for nothing.
    const issues = await run(
      inFirstTable("| TDD-0002 | TC-0001 | bogus | tests/b.test.ts | b | todo | - | - |"),
    );
    const found = issues.find((entry) => entry.code === "TDDLIST_UNKNOWN_LAYER");

    expect(found?.message).toContain("(row 1)");
    expect(found?.message).not.toContain("table 1");
  });

  it("does not report the cells of a later line that is not a row", async () => {
    // A blank `TDD-ID` under a schema-shaped header is the documented "not a
    // row" shape, which the coverage reader already skips. Reporting its
    // `Layer` would be a finding about something the ledger does not treat as
    // a row — and the `TDDLIST_TC_NOT_COVERED` it earns says the real thing.
    const codes = (await run(inLaterTable("|  | TC-0001 | bogus |  |  |  |  |  |"))).map(
      (entry) => entry.code,
    );

    expect(codes).not.toContain("TDDLIST_UNKNOWN_LAYER");
    expect(codes).not.toContain("TDDLIST_INVALID_ID");
    expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
  });

  it("keeps an unknown Layer at warning rather than turning it into a coverage failure", async () => {
    // Deliberate: the row IS a ledger row — it has an id, a test file, a
    // selector and a status — so "this TC has no row" would be false. Which
    // severity a wrong `Layer` deserves is what `TDDLIST_COVERAGE_LAYER_MISMATCH`
    // stages, and `TDDLIST_UNKNOWN_LAYER` is a warning because ledgers written
    // before the enum existed carry project-specific names. Escalating here
    // would make a typo stricter than a known-but-wrong layer next to it, and
    // `QFAI-WAIVER-002` refuses every waiver on an `error`.
    const codes = (
      await run(inLaterTable("| TDD-0002 | TC-0001 | bogus | tests/b.test.ts | b | todo | - | - |"))
    ).map((entry) => entry.code);

    expect(codes).toContain("TDDLIST_UNKNOWN_LAYER");
    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
  });
});

describe("the heading form wins over a table row for the same TC", () => {
  it("does not re-add a heading-declared L3 TC as a coverage target", async () => {
    // `collectTcLevels` and the scaffold parser both prefer the heading. The
    // ledger gate did not, so a TC declared `L3` by its heading and `L1` by a
    // table row owed a QFAI-ATDD-112 annotation *and* a ledger row — the two
    // gates disagreeing about the same TC.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-heading-wins-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## TC-0001: declared L3 by its heading",
          "",
          "- Level: L3",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const codes = (await validateTddList(root, defaultConfig)).map((entry) => entry.code);
      expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("the first declaration wins across tables, not only across shapes", () => {
  it("keeps an earlier L3 row over a later L1 row for the same TC", async () => {
    // `collectTcLevels` keeps the first declaration, so `QFAI-ATDD-112` owns
    // the TC. The ledger gate's non-coverage `continue` left the id
    // unrecorded, so the later `L1` row added a `TDDLIST_TC_NOT_COVERED`
    // obligation on top — the two gates disagreeing about one TC again, this
    // time between two tables rather than between heading and table.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-table-wins-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L3 | AC-0001 | - | s | e |",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const codes = (await validateTddList(root, defaultConfig)).map((entry) => entry.code);
      expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("exactly one gate owns a TC however its Level was written", () => {
  /**
   * Both gates on one spec. The property under test is not what either says on
   * its own but that they never both claim, or both disown, the same TC.
   */
  async function gatesFor(
    testCases: string,
  ): Promise<{ atdd: string[]; tdd: string[]; levels: Map<string, string> }> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-one-gate-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      for (const [name, body] of [
        ["01_Spec.md", "# Spec\n"],
        ["02_User-stories.md", "# US\n"],
        ["03_Acceptance-Criteria.md", "# AC\n"],
      ] as const) {
        await writeFile(path.join(specDir, name), body, "utf-8");
      }
      await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "",
        ].join("\n"),
        "utf-8",
      );
      return {
        atdd: (await validateAtddCodeTraceability(root, defaultConfig)).map((entry) => entry.code),
        tdd: (await validateTddList(root, defaultConfig)).map((entry) => entry.code),
        levels: collectTcLevels(testCases),
      };
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const owners = (gates: { atdd: string[]; tdd: string[] }): string[] =>
    [
      gates.atdd.includes("QFAI-ATDD-112") ? "atdd" : null,
      gates.tdd.includes("TDDLIST_TC_NOT_COVERED") ? "ledger" : null,
    ].filter((owner): owner is string => owner !== null);

  const headings = (...levels: string[]): string =>
    [
      "# 06 Test Cases",
      "",
      ...levels.flatMap((level, index) => [
        `## TC-0001: declaration ${index + 1}`,
        "",
        `- Level: ${level}`,
        "",
      ]),
    ].join("\n");

  describe("two headings for one TC", () => {
    // `collectTcLevels` used `set` on every pair, so the *last* heading won on
    // the ATDD side while the ledger side kept the first. `L1` then `L3` was
    // owed by both gates at once; the mirror order would have been owed by both
    // the moment either side changed alone. Only first-seen on both makes the
    // pair agree in either order — and it is the rule the table reader and the
    // scaffold parser already follow.
    it.each([
      ["L1", "L3"],
      ["L3", "L1"],
    ])("is owned by exactly one gate when declared %s then %s", async (first, second) => {
      const gates = await gatesFor(headings(first, second));

      expect(owners(gates)).toHaveLength(1);
      expect(gates.levels.get("TC-0001")).toBe(first.toLowerCase());
    });

    it("hands an L1-then-L3 TC to the ledger, which is what the first heading declared", async () => {
      const gates = await gatesFor(headings("L1", "L3"));

      expect(owners(gates)).toEqual(["ledger"]);
      expect(gates.atdd).toContain("QFAI-ATDD-117");
    });

    it("does not let a level-less heading outrank a later levelled one", async () => {
      // First-seen is about *declarations*. A `## TC-0001` block with no
      // `- Level:` line declares nothing, so it must not consume the slot.
      const gates = await gatesFor(
        [
          "# 06 Test Cases",
          "",
          "## TC-0001: no level",
          "",
          "- AC-Refs: AC-0001",
          "",
          "## TC-0001: declared",
          "",
          "- Level: L1",
          "",
        ].join("\n"),
      );

      expect(owners(gates)).toEqual(["ledger"]);
    });
  });

  describe("a blank Level settled by a later explicit one", () => {
    // `classifyCoverageLevel("")` is `coverage-target`, so a row that states no
    // `Level` provisionally claims the TC for the ledger. The ATDD collector
    // ignores a blank cell entirely and takes the later `L3`, so the
    // provisional claim had to be released and was not: a TC with a correct
    // integration annotation owed `QFAI-ATDD-112` and `TDDLIST_TC_NOT_COVERED`
    // together, and full validation failed on a spec that was right.
    const withLevelColumn = [
      "# 06 Test Cases",
      "",
      "## Test Case Table",
      "",
      "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
      "| ----- | ----- | ------- | ------ | ----- | -------- |",
      "| TC-0001 |  | AC-0001 | - | s | e |",
      "",
      "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
      "| ----- | ----- | ------- | ------ | ----- | -------- |",
      "| TC-0001 | L3 | AC-0001 | - | s | e |",
      "",
    ].join("\n");

    const withoutLevelColumn = [
      "# 06 Test Cases",
      "",
      "## Test Case Table",
      "",
      "| TC-ID | AC-Refs | EX-Ref | Steps | Expected |",
      "| ----- | ------- | ------ | ----- | -------- |",
      "| TC-0001 | AC-0001 | - | s | e |",
      "",
      "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
      "| ----- | ----- | ------- | ------ | ----- | -------- |",
      "| TC-0001 | L3 | AC-0001 | - | s | e |",
      "",
    ].join("\n");

    it.each([
      ["a blank Level cell", withLevelColumn],
      ["no Level column at all", withoutLevelColumn],
    ])("releases the provisional target after %s", async (_name, testCases) => {
      const gates = await gatesFor(testCases);

      expect(owners(gates)).toEqual(["atdd"]);
      expect(gates.levels.get("TC-0001")).toBe("l3");
    });

    it.each([
      [
        "a blank Level cell",
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 |  | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
      ],
      [
        "no Level column at all",
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
      ],
    ])("gives ATDD sole ownership of %s", async (_name, testCases) => {
      // An unstated `Level` still has to land on a gate, and it lands on
      // exactly one. `toContain("ledger")` asserted only that it landed; the
      // half left unasserted was the defect. The ledger claimed the TC as a
      // coverage target while `QFAI-ATDD-112` claimed the same TC for
      // `tests/integration/**`, so one TC was owed to two owners, two test
      // trees and two evidence files, and the `Layer` of the row the ledger
      // seeds — which is what gate item 10 picks the evidence file by — was
      // underivable. ATDD keeps it, which is the answer the heading form
      // ("a heading TC that declares no Level is owed by ATDD") already gave.
      const gates = await gatesFor(testCases);

      expect(owners(gates)).toEqual(["atdd"]);
    });

    it("adopts a later explicit coverage Level instead of the blank it recorded", async () => {
      // The crosswalk reads the recorded `Level`; leaving it `""` would make a
      // declared L1 look like a TC that declared nothing, and
      // `TDDLIST_COVERAGE_LAYER_MISMATCH` would go quiet on an Integration row.
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provisional-upgrade-"));
      try {
        const specDir = path.join(root, ".qfai", "specs", "spec-0001");
        await mkdir(path.join(specDir, "tdd"), { recursive: true });
        await writeFile(
          path.join(specDir, "06_Test-Cases.md"),
          [
            "# 06 Test Cases",
            "",
            "## Test Case Table",
            "",
            "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
            "| ----- | ----- | ------- | ------ | ----- | -------- |",
            "| TC-0001 |  | AC-0001 | - | s | e |",
            "",
            "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
            "| ----- | ----- | ------- | ------ | ----- | -------- |",
            "| TC-0001 | L1 | AC-0001 | - | s | e |",
            "",
          ].join("\n"),
          "utf-8",
        );
        await writeFile(
          path.join(specDir, "tdd", "test-list.md"),
          [
            "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
            "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
            "| TDD-0001 | TC-0001 | integration | tests/integration/a.test.ts | a | todo | - | - |",
            "",
          ].join("\n"),
          "utf-8",
        );

        const found = (await validateTddList(root, defaultConfig)).find(
          (entry) => entry.code === "TDDLIST_COVERAGE_LAYER_MISMATCH",
        );

        expect(found?.message).toContain("Level=l1");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });
});

describe("one Level predicate, one normalization, one answer", () => {
  // The same question was asked three ways. `resolveTcHomeKind` tested
  // `NO_ATDD_OBLIGATION_LEVELS.has(level)` against the raw map value, the
  // exported `isOutsideAtddObligation` tested
  // `...has(level.trim().toLowerCase())`, and `qfai atdd scaffold` carried a
  // third spelling of its own. Three copies of one predicate are three chances
  // for the routing rule and the exclusion rule to disagree about one cell —
  // the defect class this change exists to close, arriving through the back
  // door. They now share `resolveAtddHomeKind`, which owns the normalization.
  const routes: Array<[string | undefined, AtddTestKind | null]> = [
    [" L1 ", null],
    ["l1\t", null],
    [" Unit", null],
    ["L2 ", null],
    [" COMPONENT ", null],
    [" l3 ", "integration"],
    ["\tIntegration", "integration"],
    [" L4 ", "api"],
    ["API ", "api"],
    [" l5\t", "e2e"],
    ["\tE2E ", "e2e"],
    // No `Level` column at all: the historical default, unchanged. A blank
    // cell reaches the same answer — the collector reports it as no
    // declaration — and the ledger no longer claims it in parallel
    // (`classifyCoverageLevel("")` is `non-coverage`), so this default is the
    // TC's only gate rather than its second one.
    [undefined, "integration"],
    ["", "integration"],
    ["   ", "integration"],
  ];

  it.each(routes)("resolves %s the same way whichever entry point asks", (level, home) => {
    expect(resolveAtddHomeKind(level)).toBe(home);
    expect(isOutsideAtddObligation(level)).toBe(home === null);
  });

  it.each(["constructor", " Constructor ", "__proto__", "hasOwnProperty"])(
    "treats the Level cell %s as the unknown value it is",
    (level) => {
      // The raw lookup indexed a plain object literal with a key taken straight
      // out of a spec document, so a cell spelled `constructor` or `__proto__`
      // resolved to something off `Object.prototype` instead of `undefined` and
      // never reached the `?? "integration"` default. Normalization is what
      // makes ` Constructor ` reach that key, so the two are one defect.
      expect(resolveAtddHomeKind(level)).toBe("integration");
      expect(isOutsideAtddObligation(level)).toBe(false);
    },
  );

  // The set identity is asserted here as well as implied by the import,
  // because the import is the kind of thing a future edit undoes by inlining
  // a literal "for clarity" — and the resulting divergence is silent.
  it("asks one word list what Unit and Component are called", () => {
    expect(new Set(UNIT_COMPONENT_LAYERS)).toEqual(new Set(["unit", "component", "l1", "l2"]));
    for (const spelling of UNIT_COMPONENT_LAYERS) {
      expect(isOutsideAtddObligation(spelling)).toBe(true);
      expect(classifyCoverageLevel(spelling)).toBe("coverage-target");
    }
  });

  // The property the exclusion rests on, stated at the predicate level so it
  // survives the constants being split apart again: dropping the ATDD
  // obligation for a `Level` is only safe while the ledger picks that `Level`
  // up. A cell that is outside ATDD *and* non-coverage is owed by no gate —
  // an `error` deleted by one keystroke in a spec table.
  it.each([
    "l1",
    "L1",
    " Unit ",
    "l2",
    "COMPONENT",
    "l3",
    "Integration",
    "L4",
    "api",
    "l5",
    " E2E ",
    "",
    "   ",
    "L3/L5",
    "constructor",
    "__proto__",
    "unti",
  ])("leaves no gate owning the Level cell %s", (level) => {
    const outsideAtdd = isOutsideAtddObligation(level);
    const ledgerOwns = classifyCoverageLevel(level) !== "non-coverage";
    expect(outsideAtdd && !ledgerOwns).toBe(false);
  });

  it("does not let a Level cell reach into Object.prototype", async () => {
    // End to end: the inherited value is neither `"integration"` nor any other
    // `AtddTestKind`, so the correctly placed annotation was not counted AND
    // was reported as forbidden where it sat — two errors from one correct
    // action, on a cell the author only misspelled.
    await withProject(
      [{ id: "TC-0001", level: " Constructor " }],
      { "tests/integration/spec_0001/tc-0001.test.ts": "// QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const found = codes(await validateAtddCodeTraceability(root, defaultConfig));
        expect(found).not.toContain("QFAI-ATDD-112");
        expect(found).not.toContain("QFAI-ATDD-123");
      },
    );
  });
});

describe("a pre-upgrade L4/L5 skeleton is not told to implement an assertion", () => {
  it("reports a move/delete remediation instead of the placeholder gate", async () => {
    // The command stopped generating these, but the ones it already wrote into
    // `tests/integration/**` remain. `D-SCAFFOLD-PLACEHOLDER` escalates them
    // and says to write the assertion — which discharges nothing, because the
    // TC's declared `Level` routes elsewhere and `QFAI-ATDD-123` keeps
    // rejecting the annotation wherever the file sits.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-foreign-scaffold-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      for (const [name, body] of [
        ["01_Spec.md", "# Spec\n"],
        ["02_User-stories.md", "# US\n"],
        ["03_Acceptance-Criteria.md", "# AC\n"],
      ] as const) {
        await writeFile(path.join(specDir, name), body, "utf-8");
      }
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001-0001 | L4 | AC-0001 | - | s | e |",
          "| TC-0001-0002 | L3 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const skeleton = (tcId: string): string =>
        [
          `// ${SCAFFOLD_PLACEHOLDER_MARKER}`,
          `it('${tcId}', () => {`,
          `  // TODO: implement assertion for ${tcId}`,
          "});",
          "",
        ].join("\n");
      const dir = path.join(root, "tests", "integration", "spec-0001");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "TC-0001-0001.test.ts"), skeleton("TC-0001-0001"), "utf-8");
      await writeFile(path.join(dir, "TC-0001-0002.test.ts"), skeleton("TC-0001-0002"), "utf-8");

      const issues = await validateScaffoldPlaceholder(root, defaultConfig);

      const foreign = issues.find((entry) => entry.code === "D-SCAFFOLD-FOREIGN-HOME");
      expect(foreign?.severity).toBe("warning");
      expect(foreign?.refs).toEqual(["TC-0001-0001"]);
      expect(foreign?.suggested_action).toContain("Write the real test");

      // The L4 skeleton is not also reported as an unfilled placeholder, and
      // the L3 one still is — the gate keeps working for the rows it owns.
      const placeholders = issues.filter((entry) => entry.code === "D-SCAFFOLD-PLACEHOLDER");
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0]?.refs).toEqual(["TC-0001-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
