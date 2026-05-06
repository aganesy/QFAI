import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import {
  validateExplorationArtifacts,
  validateOptionComparison,
} from "../../../src/core/validators/uix/comparisonValidator.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-direction-validator-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("comparisonValidator", () => {
  it("exports validateExplorationArtifacts alias", () => {
    expect(validateExplorationArtifacts).toBe(validateOptionComparison);
  });

  it("pass: review bundle with best-of-history shape", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // The legacy 33_exploration_rubric.md / 34_evaluator_calibration.md
    // sidecars are no longer required (DESIGN.md is the brand SSOT and
    // ORDINAL_AXES is the evaluator-axes constant). Only the review
    // bundle's best-of-history wording is validated here.
    await writeFile(
      path.join(root, "uiux", "50_review_input_bundle.md"),
      "# Review Input Bundle\n\n## Best-of-history\nRetain stronger earlier directions when later loops regress.\n",
      "utf-8",
    );

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("fail: UI-bearing pack with bundle missing best-of-history wording emits exactly the history-missing issue", async () => {
    // Same fixture as the `pass:` test above, which already establishes
    // that the spec is detected as UI-bearing. The bundle is present
    // but lacks the best-of-history wording → the validator MUST emit
    // exactly the UIX-VAL-DIRECTION-HISTORY-MISSING issue. An
    // unconditional assertion is required here because a vacuous
    // green-pass (silent return → 0 issues) is the regression class
    // this test exists to catch (the deleted Direction-Rubric /
    // Evaluator-Calibration codes used to provide the only fail-path
    // coverage; this is now the sole fail-path for the validator).
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "50_review_input_bundle.md"),
      "# Review Input Bundle\n\nThis bundle omits the required wording.\n",
      "utf-8",
    );

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.code === "UIX-VAL-DIRECTION-HISTORY-MISSING")).toBe(true);
  });

  it("non-ui: returns empty array for non-ui specs", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues).toEqual([]);
  });
});
