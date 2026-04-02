/**
 * Scoring-ready validator tests — spec-0034 TDD-0013..TDD-0015, TDD-0025, TDD-0028
 *
 * QFAI:SPEC-0002:TC-0002-0013
 * QFAI:SPEC-0002:TC-0002-0014
 * QFAI:SPEC-0002:TC-0002-0015
 * QFAI:SPEC-0002:TC-0002-0025
 * QFAI:SPEC-0002:TC-0002-0028
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateScoringReady } from "../../../src/core/validators/uix/scoringReady.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-scoring-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

const ALL_16_FIELDS = [
  "axis_id",
  "axis_name",
  "layer",
  "definition",
  "rationale",
  "scoring_rubric",
  "weight",
  "min_score",
  "max_score",
  "pass_threshold",
  "evidence_type",
  "evidence_source",
  "review_prompt",
  "calibration_anchor",
  "dependencies",
  "review_questions",
] as const;

function completeAxisContent(): string {
  const lines = ["# Scoring Axes", "", "## Axis: accessibility", ""];
  for (const field of ALL_16_FIELDS) {
    lines.push(`- ${field}: Valid value for ${field}`);
  }
  return lines.join("\n");
}

function aggregateScoringContent(): string {
  return [
    "# Aggregate Scoring Rules",
    "",
    "- thresholds: min 70 overall",
    "- floors: no axis below 50",
    "- plateau: diminishing returns above 90",
    "- missing_score_policy: exclude from aggregate",
  ].join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("scoring-ready validator", () => {
  it("complete pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Write to canonical split file
    await writeFile(
      path.join(root, "uiux", "20_design_eval_invariant.md"),
      completeAxisContent(),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);

    expect(issues.filter((i) => i.code === "UIX-VAL-DYNAMIC-AXIS-INCOMPLETE")).toHaveLength(0);
  });

  it("incomplete fail", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Axis missing scoring_rubric and calibration_anchor
    const lines = ["# Scoring Axes", "", "## Axis: accessibility", ""];
    for (const field of ALL_16_FIELDS) {
      if (field === "scoring_rubric" || field === "calibration_anchor") continue;
      lines.push(`- ${field}: Valid value for ${field}`);
    }
    await writeFile(
      path.join(root, "uiux", "20_design_eval_invariant.md"),
      lines.join("\n"),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);

    const incomplete = issues.filter((i) => i.code === "UIX-VAL-DYNAMIC-AXIS-INCOMPLETE");
    expect(incomplete.length).toBeGreaterThan(0);
    expect(incomplete[0]?.message).toContain("scoring_rubric");
    expect(incomplete[0]?.message).toContain("calibration_anchor");
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateScoringReady(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("aggregate rules pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_design_eval_invariant.md"),
      completeAxisContent(),
      "utf-8",
    );
    await writeFile(
      path.join(root, "uiux", "23_design_eval_aggregate.md"),
      aggregateScoringContent(),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);

    expect(issues.filter((i) => i.code === "UIX-VAL-AGGREGATE-SCORING-INCOMPLETE")).toHaveLength(0);
  });

  it("full mandatory pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_design_eval_invariant.md"),
      completeAxisContent(),
      "utf-8",
    );
    await writeFile(
      path.join(root, "uiux", "23_design_eval_aggregate.md"),
      aggregateScoringContent(),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);

    // Both per-axis and aggregate pass
    expect(issues).toHaveLength(0);
  });
});
