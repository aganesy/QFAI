/**
 * Integration tests for spec-0010 v1.7.17 discussion guideline hardening.
 *
 * QFAI:SPEC-0010:TC-0010-0051
 * QFAI:SPEC-0010:TC-0010-0053
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateScoringReady } from "../../src/core/validators/uix/scoringReady.js";
import { validateTrendScan } from "../../src/core/validators/uix/trendScan.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-v1717-spec0010-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function contextBlock(uiBearing: boolean): string {
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

async function createPack(root: string, uiBearing: boolean): Promise<void> {
  await writeFile(
    path.join(root, "01_Spec.md"),
    `# Spec\n\n- surface: ${uiBearing ? "web" : "non-ui"}\n`,
    "utf-8",
  );
  await writeFile(path.join(root, "01_Context.md"), contextBlock(uiBearing), "utf-8");
  if (uiBearing) {
    await mkdir(path.join(root, "uiux"), { recursive: true });
    await writeFile(
      path.join(root, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Trend Scan",
        "",
        "### user expectation / market norm",
        "",
        "#### Entry SRC-UE-01",
        "",
        "- source_id: SRC-UE-01",
        "- reference: https://example.com/reference",
        "- observation: Concrete observation.",
        "- decision_connection: Maps to a local design decision.",
        "- evaluation_connection: TRD-01",
        "- local_implication: Local implication.",
        "",
      ].join("\n"),
      "utf-8",
    );
  }
}

function adjectiveOnlyTrendAxis(): string {
  return [
    "# Scoring Axes",
    "",
    "## Axis: typographic-rhythm",
    "",
    "- axis_id: TRD-01",
    "- axis_name: Typographic Rhythm",
    "- layer: trend-derived",
    "- origin: Design trend research",
    "- intent: Measures typographic consistency.",
    "- why_it_matters: Typographic clarity affects trust.",
    "- score_scale: 1-5",
    "- score_anchors:",
    "  - low: very rough and inconsistent",
    "  - mid: reasonably polished and modern",
    "  - high: very polished and modern",
    "- positive_signals:",
    "  - Consistent rhythm",
    "- negative_signals:",
    "  - Inconsistent rhythm",
    "- anti_patterns:",
    "  - Arbitrary font sizing",
    "- evidence_required: Screenshot review",
    "- weight: 0.20",
    "- minimum_floor: 2",
    "- source_refs:",
    "  - SRC-UE-01",
    "- goal_refs:",
    "  - REQ-0001",
    "- review_questions:",
    "  - Is the rhythm intentional?",
    "",
  ].join("\n");
}

describe("spec-0010 v1.7.17 integration", () => {
  // QFAI:SPEC-0010:TC-0010-0051
  it("allows non-UI packs to skip guideline research without warnings", async () => {
    const root = await newTempDir();
    await createPack(root, false);

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.filter((issue) => issue.code === "UIX-VAL-T05")).toHaveLength(0);
    expect(issues).toEqual([]);
  });

  // QFAI:SPEC-0010:TC-0010-0053
  it("treats adjective-only score anchors as non-compliant and emits UIX-VAL-T06", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "uiux", "21_design_eval_trend_derived.md"),
      adjectiveOnlyTrendAxis(),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);
    const warnings = issues.filter((issue) => issue.code === "UIX-VAL-T06");

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.severity).toBe("warning");
    expect(warnings[0]?.message).toContain("TRD-01");
  });
});
