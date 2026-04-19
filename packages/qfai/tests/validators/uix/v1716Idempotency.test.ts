/**
 * Idempotency of v1.7.16 validators — spec-0014 TDD-0031
 *
 * QFAI:SPEC-0014:TC-0014-0031
 *
 * Each v1.7.16 validator MUST produce byte-identical Issue[] outputs when
 * run twice against the same fixture. This guards against non-deterministic
 * ordering (fs.readdir order, Set iteration, hash-based grouping) that
 * would otherwise cause intermittent diffs in validate reports.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateDesignSystemPresence } from "../../../src/core/validators/uix/designSystemPresence.js";
import { validateTrendAxisTraceability } from "../../../src/core/validators/uix/trendAxisTraceability.js";
import { validatePrototypingDesignSystem } from "../../../src/core/validators/prototypingDesignSystem.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-idem-v1716-"));
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
    "- classification_rationale: Screen-first workflow.",
    "",
  ].join("\n");
}

function sourcesWithMultipleTrendEntries(): string {
  // Craft entries such that T01 (missing evaluation_connection),
  // T02 (dangling TRD ref), T04 (visual category but no visual axis)
  // all fire — we need non-trivial multi-issue output to exercise sort
  // stability.
  return [
    "# Sources",
    "",
    "## Trend Scan",
    "",
    "### Visual",
    "",
    "#### Entry TS-01",
    "",
    "- source_id: TS-01",
    "- evaluation_connection:",
    "",
    "#### Entry TS-02",
    "",
    "- source_id: TS-02",
    "- evaluation_connection: TRD-99",
    "",
    "### Typography",
    "",
    "#### Entry TS-03",
    "",
    "- source_id: TS-03",
    "- evaluation_connection: TRD-01",
    "",
  ].join("\n");
}

function trdAxesWithoutVisual(): string {
  return [
    "# Trend-derived evaluation axes",
    "",
    "## Axes",
    "",
    "### Axis: TRD-01 — Typography hierarchy",
    "",
    "- source_refs: [SRC-01]",
    "- weight: 0.3",
    "",
  ].join("\n");
}

function designSystemWithGaps(): string {
  // Present but missing required sections (DS02 fires for each).
  return [
    "# Design System",
    "",
    "## Visual Theme",
    "",
    "Neutral.",
    "",
    "## Color Palette",
    "",
    "TBD",
    "",
  ].join("\n");
}

async function setupFixture(): Promise<{ root: string; packDir: string }> {
  const root = await newTempRoot();
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260418120000000");
  await mkdir(path.join(packDir, "uiux"), { recursive: true });

  await writeFile(path.join(packDir, "01_Context.md"), uiBearingContext(), "utf-8");
  await writeFile(path.join(packDir, "04_Sources.md"), sourcesWithMultipleTrendEntries(), "utf-8");
  await writeFile(
    path.join(packDir, "uiux", "21_design_eval_trend_derived.md"),
    trdAxesWithoutVisual(),
    "utf-8",
  );
  await writeFile(
    path.join(packDir, "uiux", "12_design_system.md"),
    designSystemWithGaps(),
    "utf-8",
  );
  await writeFile(
    path.join(packDir, "prototyping.json"),
    JSON.stringify({ recommended_mode: "full-harness", scoringTrace: {} }),
    "utf-8",
  );

  return { root, packDir };
}

describe("v1.7.16 validators are idempotent", () => {
  // QFAI:SPEC-0014:TC-0014-0031
  it("validateTrendAxisTraceability returns identical issue list across two runs", async () => {
    const { packDir } = await setupFixture();
    const first = await validateTrendAxisTraceability(packDir, defaultConfig);
    const second = await validateTrendAxisTraceability(packDir, defaultConfig);
    expect(second).toEqual(first);
    // Sanity: the fixture exercises multiple rules so the comparison is meaningful.
    expect(first.length).toBeGreaterThan(0);
  });

  // QFAI:SPEC-0014:TC-0014-0031
  it("validateDesignSystemPresence returns identical issue list across two runs", async () => {
    const { packDir } = await setupFixture();
    const first = await validateDesignSystemPresence(packDir, defaultConfig);
    const second = await validateDesignSystemPresence(packDir, defaultConfig);
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
  });

  // QFAI:SPEC-0014:TC-0014-0031
  it("validatePrototypingDesignSystem returns identical issue list across two runs", async () => {
    const { root } = await setupFixture();
    const first = await validatePrototypingDesignSystem(root, defaultConfig);
    const second = await validatePrototypingDesignSystem(root, defaultConfig);
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
  });
});
