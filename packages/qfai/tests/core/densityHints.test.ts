import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDensityHints } from "../../src/core/validators/densityHints.js";

async function withTempSpec(test: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-density-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "04_Business-Rules.md"), "# BR\n", "utf-8");
    await test(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * A spec pack in the layered layout, with `sections` written into each of the
 * three files the density rules read.
 */
async function writeLayeredSpec(
  root: string,
  dirName: string,
  lifecycle: string[],
  sections: string,
): Promise<string> {
  // The layered skeleton, because the layout decides which file names the
  // density rules read: a pack carrying `01_Spec.md` alone is read as the
  // legacy one, whose business rules live under a different name.
  const specDir = path.join(root, ".qfai", "specs", dirName);
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    ["# 01 Spec", "", ...lifecycle, ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
  await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
  for (const [file, heading] of [
    ["04_Business-Rules.md", "Business Rules"],
    ["05_Examples.md", "Examples"],
    ["06_Test-Cases.md", "Test Cases"],
  ] as const) {
    await writeFile(path.join(specDir, file), `# ${heading}\n\n${sections}\n`, "utf-8");
  }
  return specDir;
}

/** A tombstone pack: a terminal `Status:` and the record each section carries. */
const TOMBSTONE = "N/A — this spec has been deleted. See 01_Spec.md for the deletion record.";

async function writeRetiredSpec(root: string, status: string, companion?: string): Promise<void> {
  const lifecycle =
    companion === undefined ? [`- Status: ${status}`] : [`- Status: ${status}`, companion];
  // SUPERSEDE moves the obligations somewhere, so the successor has to exist
  // and be able to hold them. Without one the retirement is incomplete and
  // every rule keeps treating the spec as current.
  if (companion?.includes("Superseded-by: spec-0009") === true) {
    await writeLayeredSpec(root, "spec-0009", ["- Status: active"], "- BR-0009-0001: the rule");
  }
  await writeLayeredSpec(root, "spec-0002", lifecycle, TOMBSTONE);
}

describe("a spec that has stopped applying", () => {
  /** The rules that read a section file for the IDs it should carry. */
  const SECTION_DENSITY_CODES = [
    "QFAI-DENSITY-001",
    "QFAI-DENSITY-002",
    "QFAI-DENSITY-003",
    "QFAI-DENSITY-004",
  ];

  it.each([
    ["superseded", "- Superseded-by: spec-0009"],
    ["deprecated", "- Deprecated-at: 2026-01-01"],
    ["removed", "- Deprecated-at: 2026-01-01"],
  ])("reports no density finding against a %s spec", async (status, companion) => {
    // A retired spec has no business rules, no examples and no test cases —
    // that is what retiring it means. Reported anyway, the findings are correct
    // as statements of fact and permanent as findings: no change clears them.
    await withTempSpec(async (root) => {
      await writeRetiredSpec(root, status, companion);

      const issues = await validateDensityHints(root, defaultConfig);
      const retired = issues.filter((entry) => entry.file?.includes("spec-0002") === true);
      expect(retired.map((entry) => entry.code)).toEqual([]);
    });
  });

  it("keeps reporting the empty sections of a spec beside it", async () => {
    // The skip is per spec. One retirement must not quiet the pack next to it,
    // which is the whole difference from turning the rule off.
    await withTempSpec(async (root) => {
      await writeRetiredSpec(root, "superseded", "- Superseded-by: spec-0009");
      await writeLayeredSpec(root, "spec-0003", ["- Status: active"], "prose only");

      const issues = await validateDensityHints(root, defaultConfig);
      const codes = issues
        .filter((entry) => entry.file?.includes("spec-0003") === true)
        .map((entry) => entry.code);
      expect(codes).toContain("QFAI-DENSITY-001");
    });
  });

  it("still reports a spec whose retirement is not declared completely", async () => {
    // `superseded` without a successor is not a retirement the tree can act on
    // — every rule treats such a spec as current, and this one has to agree, or
    // an incomplete declaration becomes a way to silence the gate.
    await withTempSpec(async (root) => {
      await writeRetiredSpec(root, "superseded");

      const issues = await validateDensityHints(root, defaultConfig);
      const codes = issues
        .filter((entry) => entry.file?.includes("spec-0002") === true)
        .map((entry) => entry.code);
      expect(codes.some((code) => SECTION_DENSITY_CODES.includes(code))).toBe(true);
    });
  });

  it("still reports a spec with no Status bullet at all", async () => {
    await withTempSpec(async (root) => {
      await writeLayeredSpec(root, "spec-0002", [], "prose only");

      const issues = await validateDensityHints(root, defaultConfig);
      const codes = issues
        .filter((entry) => entry.file?.includes("spec-0002") === true)
        .map((entry) => entry.code);
      expect(codes).toContain("QFAI-DENSITY-001");
    });
  });
});

describe("validateDensityHints", () => {
  it("accepts layered markdown example and test case tables", async () => {
    await withTempSpec(async (root) => {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await writeFile(
        path.join(specDir, "05_Examples.md"),
        [
          "# 05 Examples",
          "",
          "| EX-ID        | BR-Ref       | Input | Expected |",
          "| ------------ | ------------ | ----- | -------- |",
          "| EX-0001-0001 | BR-0001-0001 | in    | out      |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps | Expected |",
          "| ------------ | ----- | ------------ | ------------ | ----- | -------- |",
          "| TC-0001-0001 | L2    | AC-0001-0001 | EX-0001-0001 | step  | ok       |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateDensityHints(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-DENSITY-002")).toBe(false);
      expect(issues.some((entry) => entry.code === "QFAI-DENSITY-004")).toBe(false);
    });
  });
});
