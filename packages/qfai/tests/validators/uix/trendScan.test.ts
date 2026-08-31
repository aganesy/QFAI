/**
 * Trend-scan validator tests.
 *
 * `04_Sources.md#Trend Scan` is live SSOT — only the `uiux/20_trend_scan.md`
 * sidecar was retired — so this validator stays in the canonical set and keeps
 * its pass / fail / non-UI fixtures here.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateTrendScan } from "../../../src/core/validators/uix/trendScan.js";

// Anchored to this file, not to `process.cwd()`: Vitest may be launched from
// the repository root or from `packages/qfai`.
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
);
const SHIPPED_SOURCES_TEMPLATE = path.join(
  repoRoot,
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/04_Sources.md",
);

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-trend-scan-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

function completeTrendScan(): string {
  const category = (name: string) =>
    [
      `### ${name}`,
      "",
      "#### Entry 1",
      "",
      "- reference: https://example.com",
      "- observation: Concrete trend observation.",
      "- decision_connection: Influences which option should be selected.",
      "- evaluation_connection: Creates a concrete scoring/checking lens.",
      "- local_implication: Concrete local implication.",
      "",
    ].join("\n");

  return [
    "# 04 Sources",
    "",
    "## Source Registry",
    "",
    "| SRC-ID | Title | Type | URL | Retrieved | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    "",
    "## Trend Scan",
    "",
    category("user expectation / market norm"),
    category("product neighbor / comparable flow"),
    category("platform convention"),
    category("accessibility / compliance relevant signal"),
    "### design_guideline_research",
    "",
    "#### Entry 1",
    "",
    "- source_id: SRC-DGS-001",
    "- guideline_name: Material Design 3 — Elevation",
    "- rule_refs: https://m3.material.io/styles/elevation/overview",
    "- local_translation: Apply elevated surface tokens (dp2, dp4, dp8) for modal overlays.",
    "- evidence: Reviewed official elevation guidelines; confirmed dp4 is the recommended card elevation.",
    "",
    "## Competitive Reference Registry",
    "",
    "## Traceability",
    "",
  ].join("\n");
}

describe("validateTrendScan", () => {
  it("passes when all categories and fields are present in 04_Sources.md", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "04_Sources.md"), completeTrendScan(), "utf-8");

    await expect(validateTrendScan(root, defaultConfig)).resolves.toEqual([]);
  });

  it("fails when 04_Sources.md is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-SCAN-MISSING")).toBe(true);
  });

  it("fails when a required category is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "04_Sources.md"),
      completeTrendScan().replace(
        /### accessibility \/ compliance relevant signal[\s\S]*?(?=##|$)/,
        "",
      ),
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-CATEGORY-MISSING")).toBe(true);
  });

  it("fails when decision_connection is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "04_Sources.md"),
      completeTrendScan().replace(
        "- decision_connection: Influences which option should be selected.",
        "",
      ),
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-FIELD-MISSING")).toBe(true);
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("ignores 20_trend_scan.md even if present (canonical source is 04_Sources.md)", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "20_trend_scan.md"), "# Old Trend Scan", "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-SCAN-MISSING")).toBe(true);
  });
});

function classificationBlock(uiBearing: boolean): string {
  if (uiBearing) {
    return [
      "# Context",
      "",
      "## UI-bearing Classification",
      "",
      "- ui_bearing: true",
      "- primary_surface: web",
      "- secondary_surfaces:",
      "  - mobile",
      "- classification_rationale: Primary workflow is screen-based.",
      "",
    ].join("\n");
  }

  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces:",
    "- classification_rationale: CLI-only workflow.",
    "",
  ].join("\n");
}

async function createClassifiedPack(root: string, uiBearing: boolean): Promise<void> {
  await writeFile(
    path.join(root, "01_Spec.md"),
    `# Spec\n\n- surface: ${uiBearing ? "web" : "non-ui"}\n`,
    "utf-8",
  );
  await writeFile(path.join(root, "01_Context.md"), classificationBlock(uiBearing), "utf-8");
}

function entry(sourceId: string, extraLines: string[] = []): string {
  return [
    `#### Entry ${sourceId}`,
    "",
    `- source_id: ${sourceId}`,
    "- reference: https://example.com/reference",
    "- observation: Concrete trend observation.",
    "- decision_connection: Connects to a local design choice.",
    "- evaluation_connection: TRD-01",
    "- local_implication: Concrete local implication.",
    ...extraLines,
    "",
  ].join("\n");
}

function buildSources(includeGuidelineCategory: boolean, validGuidelineEntry: boolean): string {
  const lines = [
    "# 04 Sources",
    "",
    "## Trend Scan",
    "",
    "### user expectation / market norm",
    "",
    entry("SRC-UE-01"),
    "### product neighbor / comparable flow",
    "",
    entry("SRC-PN-01"),
    "### platform convention",
    "",
    entry("SRC-PC-01"),
    "### accessibility / compliance relevant signal",
    "",
    entry("SRC-AC-01"),
  ];

  if (includeGuidelineCategory) {
    lines.push("### design_guideline_research", "");
    lines.push(
      validGuidelineEntry
        ? entry("SRC-GUIDE-01", [
            "- guideline_name: WCAG 2.2",
            "- rule_refs: 2.5.5 Target Size, 1.4.3 Contrast",
            "- local_translation: Buttons keep 44px targets and 4.5:1 contrast.",
          ])
        : entry("SRC-GUIDE-01", [
            "- guideline_name: WCAG 2.2",
            "- rule_refs: TBD",
            "- local_translation: TBD",
          ]),
    );
  }

  return lines.join("\n");
}

describe("validateTrendScan guideline coverage", () => {
  it("warns when a UI-bearing pack lacks design_guideline_research coverage", async () => {
    const root = await newTempDir();
    await createClassifiedPack(root, true);
    await writeFile(path.join(root, "04_Sources.md"), buildSources(false, false), "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    const warnings = issues.filter((issue) => issue.code === "UIX-VAL-T05");

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.severity).toBe("warning");
    expect(warnings[0]?.message).toMatch(/design_guideline_research|guideline/i);
  });

  it("accepts one concrete design guideline research entry", async () => {
    const root = await newTempDir();
    await createClassifiedPack(root, true);
    await writeFile(path.join(root, "04_Sources.md"), buildSources(true, true), "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.filter((issue) => issue.code === "UIX-VAL-T05")).toHaveLength(0);
  });

  it("stays silent on a non-UI pack that carries a complete classification block", async () => {
    const root = await newTempDir();
    await createClassifiedPack(root, false);

    await expect(validateTrendScan(root, defaultConfig)).resolves.toEqual([]);
  });
});

describe("validateTrendScan against the shipped 04_Sources.md template", () => {
  it("rejects the untouched template: every bracketed slot counts as unfilled", async () => {
    const root = await newTempDir();
    await createClassifiedPack(root, true);
    const template = await readFile(SHIPPED_SOURCES_TEMPLATE, "utf-8");
    await writeFile(path.join(root, "04_Sources.md"), template, "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    const fieldMissing = issues.filter((issue) => issue.code === "UIX-VAL-TREND-FIELD-MISSING");

    // 4 required categories x 5 required fields, all seeded with `[...]`.
    expect(fieldMissing).toHaveLength(20);
    // The template's `rule_refs` list item is bracketed too, so the guideline
    // entry does not count as concrete.
    expect(issues.some((issue) => issue.code === "UIX-VAL-T05")).toBe(true);
  });

  it("reads a template-shaped multi-line rule_refs list as a concrete value", async () => {
    const root = await newTempDir();
    await createClassifiedPack(root, true);
    const sources = [
      buildSources(false, false),
      "### design_guideline_research",
      "",
      "#### Entry SRC-GUIDE-01",
      "",
      "- source_id: SRC-GUIDE-01",
      "- guideline_name: WCAG 2.2",
      "- rule_refs:",
      "  - 2.5.5 Target Size (Minimum)",
      "  - 1.4.3 Contrast (Minimum)",
      "- local_translation: Buttons keep 44px targets and 4.5:1 contrast.",
      "- evidence: Checked the published WCAG 2.2 success criteria.",
      "",
    ].join("\n");
    await writeFile(path.join(root, "04_Sources.md"), sources, "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.filter((issue) => issue.code === "UIX-VAL-T05")).toHaveLength(0);
  });

  it("still warns when the multi-line rule_refs list holds only template brackets", async () => {
    const root = await newTempDir();
    await createClassifiedPack(root, true);
    const sources = [
      buildSources(false, false),
      "### design_guideline_research",
      "",
      "#### Entry SRC-GUIDE-01",
      "",
      "- source_id: SRC-GUIDE-01",
      "- guideline_name: WCAG 2.2",
      "- rule_refs:",
      "  - [Specific rule or section reference]",
      "- local_translation: Buttons keep 44px targets and 4.5:1 contrast.",
      "",
    ].join("\n");
    await writeFile(path.join(root, "04_Sources.md"), sources, "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.filter((issue) => issue.code === "UIX-VAL-T05")).toHaveLength(1);
  });
});
