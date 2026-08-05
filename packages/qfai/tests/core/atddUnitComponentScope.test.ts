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

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

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
});
