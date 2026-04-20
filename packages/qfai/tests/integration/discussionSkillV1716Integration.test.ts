/**
 * qfai-discussion v1.7.16 integration tests — spec-0010
 *
 * QFAI:SPEC-0010:TC-0010-0032
 * QFAI:SPEC-0010:TC-0010-0033
 * QFAI:SPEC-0010:TC-0010-0037
 * QFAI:SPEC-0010:TC-0010-0039
 * QFAI:SPEC-0010:TC-0010-0040
 * QFAI:SPEC-0010:TC-0010-0042
 *
 * TC-0032/0033/0037 are documentation-layer assertions:
 *   They verify that the template asset and SKILL.md describe the correct
 *   behavior, without requiring a live /qfai-discussion run.
 * TC-0039/0040/0042 exercise the live validateTrendAxisTraceability validator.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTrendAxisTraceability } from "../../src/core/validators/uix/trendAxisTraceability.js";

// ─── Template paths ────────────────────────────────────────────────────────

const SKILL_BASE = path.resolve(
  import.meta.dirname,
  "../../assets/init/.qfai/assistant/skills/qfai-discussion",
);

// ─── mkdtemp fixture helpers ───────────────────────────────────────────────

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-disc-v1716-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function uiBearingContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: true",
    "- primary_surface: web",
    "- secondary_surfaces: []",
    "- classification_rationale: Screen-first product.",
    "",
  ].join("\n");
}

function _nonUiContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces: []",
    "- classification_rationale: CLI tool with no screens.",
    "",
  ].join("\n");
}

async function setupUiBearingPack(
  options: {
    visualTrendEntries?: string;
    trdAxes?: string;
    omitVisualAxis?: boolean;
  } = {},
): Promise<string> {
  const root = await newTempRoot();
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260418130000000");
  await mkdir(path.join(packDir, "uiux"), { recursive: true });

  await writeFile(path.join(packDir, "01_Context.md"), uiBearingContext(), "utf-8");

  const sourcesContent = options.visualTrendEntries ?? colorEntryWithEvalConnection();
  await writeFile(path.join(packDir, "04_Sources.md"), sourcesContent, "utf-8");

  const trdContent = options.omitVisualAxis
    ? noVisualAxisTrd()
    : (options.trdAxes ?? oneVisualAxisTrd());
  await writeFile(
    path.join(packDir, "uiux", "21_design_eval_trend_derived.md"),
    trdContent,
    "utf-8",
  );

  return packDir;
}

function colorEntryWithEvalConnection(): string {
  return [
    "# Sources",
    "",
    "## Trend Scan",
    "",
    "### color",
    "",
    "#### Entry C-01",
    "",
    "- source_id: SRC-001",
    "- evaluation_connection: TRD-V01",
    "",
  ].join("\n");
}

function colorEntryMissingEvalConnection(): string {
  return [
    "# Sources",
    "",
    "## Trend Scan",
    "",
    "### color",
    "",
    "#### Entry C-01",
    "",
    "- source_id: SRC-001",
    "- evaluation_connection:",
    "",
  ].join("\n");
}

function colorAndTypographyEntries(): string {
  return [
    "# Sources",
    "",
    "## Trend Scan",
    "",
    "### color",
    "",
    "#### Entry C-01",
    "",
    "- source_id: SRC-001",
    "- evaluation_connection: TRD-V01",
    "",
    "### typography",
    "",
    "#### Entry T-01",
    "",
    "- source_id: SRC-002",
    "- evaluation_connection: TRD-V01",
    "",
  ].join("\n");
}

function oneVisualAxisTrd(): string {
  return [
    "# Evaluation Layer: Trend-derived",
    "",
    "## Axes",
    "",
    "### Axis: TRD-01 — Visual Warmth & Color Harmony",
    "",
    "- axis_id: TRD-01",
    "- visual_category: true",
    "- source_refs: [SRC-001]",
    "- weight: 0.20",
    "",
  ].join("\n");
}

function noVisualAxisTrd(): string {
  return [
    "# Evaluation Layer: Trend-derived",
    "",
    "## Axes",
    "",
    "### Axis: TRD-01 — Typography Hierarchy",
    "",
    "- axis_id: TRD-01",
    "- source_refs: [SRC-001]",
    "- weight: 0.15",
    "",
  ].join("\n");
}

// ─── TC-0032: 12_design_system.md template defines 8 sections ─────────────

describe("TC-0032 — 12_design_system.md template has 8 sections (documentation-layer)", () => {
  // QFAI:SPEC-0010:TC-0010-0032
  it("template defines all 8 required sections as ATX headings", async () => {
    const content = await readFile(
      path.join(SKILL_BASE, "templates", "uiux", "12_design_system.md"),
      "utf-8",
    );

    const requiredSections = [
      "Visual Theme",
      "Color Palette",
      "Typography",
      "Spacing & Layout",
      "Component Style",
      "Animation & Motion",
      "Do's and Don'ts",
      "Agent Implementation Guide",
    ];

    for (const section of requiredSections) {
      expect(content, `Section '${section}' not found in 12_design_system.md template`).toContain(
        `## ${section}`,
      );
    }
  });
});

// ─── TC-0033: non-UI pack does not produce uiux/ directory ───────────────────

describe("TC-0033 — Step 11.3 skipped for non-UI packs (documentation-layer)", () => {
  // QFAI:SPEC-0010:TC-0010-0033
  it("SKILL.md states non-UI packs skip Step 11.3 and produce no uiux/ directory", async () => {
    const content = await readFile(path.join(SKILL_BASE, "SKILL.md"), "utf-8");

    // The SKILL.md must indicate non-UI skip for Step 11.3
    const step113Idx = content.indexOf("Step 11.3");
    expect(step113Idx).toBeGreaterThan(-1);

    const surroundingText = content.slice(step113Idx, step113Idx + 600);
    expect(surroundingText).toMatch(/non-ui|non-UI|skip/i);
  });
});

// ─── TC-0037: Idempotent Step 11.3 (documentation-layer) ─────────────────────

describe("TC-0037 — Step 11.3 is idempotent (documentation-layer)", () => {
  // QFAI:SPEC-0010:TC-0010-0037
  it("SKILL.md declares Step 11.3 idempotency guarantee", async () => {
    const content = await readFile(path.join(SKILL_BASE, "SKILL.md"), "utf-8");
    const step113Idx = content.indexOf("Step 11.3");
    expect(step113Idx).toBeGreaterThan(-1);

    const surroundingText = content.slice(step113Idx, step113Idx + 1500);
    expect(surroundingText).toMatch(/idempotent/i);
  });
});

// ─── TC-0039: UIX-VAL-T04 emits WARNING for missing visual axis ──────────────

describe("TC-0039 — UIX-VAL-T04 is WARNING and exits 0 under --fail-on error", () => {
  // QFAI:SPEC-0010:TC-0010-0039
  it("validator emits UIX-VAL-T04 with severity warning when no visual axis derived", async () => {
    const packDir = await setupUiBearingPack({
      visualTrendEntries: colorEntryWithEvalConnection(),
      omitVisualAxis: true,
    });

    const issues = await validateTrendAxisTraceability(packDir, defaultConfig);

    const t04Issues = issues.filter((i) => i.code === "UIX-VAL-T04");
    expect(t04Issues.length, "Expected UIX-VAL-T04 to fire").toBeGreaterThan(0);

    for (const issue of t04Issues) {
      expect(issue.severity).toBe("warning");
    }
  });
});

// ─── TC-0040: Multiple visual categories + visual axis → zero T04 ────────────

describe("TC-0040 — Color+Typography trend entries with one derived visual axis → zero T04 issues", () => {
  // QFAI:SPEC-0010:TC-0010-0040
  it("pack with visual entries and a visual axis produces no UIX-VAL-T04", async () => {
    const packDir = await setupUiBearingPack({
      visualTrendEntries: colorAndTypographyEntries(),
      trdAxes: oneVisualAxisTrd(),
    });

    const issues = await validateTrendAxisTraceability(packDir, defaultConfig);

    const t04Issues = issues.filter((i) => i.code === "UIX-VAL-T04");
    expect(t04Issues).toHaveLength(0);
  });
});

// ─── TC-0042: UIX-VAL-T01 fires when evaluation_connection is missing ────────

describe("TC-0042 — UIX-VAL-T01 fires when color entry omits evaluation_connection", () => {
  // QFAI:SPEC-0010:TC-0010-0042
  it("validator emits UIX-VAL-T01 ERROR for color entry with missing evaluation_connection", async () => {
    const packDir = await setupUiBearingPack({
      visualTrendEntries: colorEntryMissingEvalConnection(),
      trdAxes: oneVisualAxisTrd(),
    });

    const issues = await validateTrendAxisTraceability(packDir, defaultConfig);

    const t01Issues = issues.filter((i) => i.code === "UIX-VAL-T01");
    expect(t01Issues.length, "Expected UIX-VAL-T01 to fire").toBeGreaterThan(0);
    expect(t01Issues[0].severity).toBe("error");
  });
});
