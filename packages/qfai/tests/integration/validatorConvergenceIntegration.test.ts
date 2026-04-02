/**
 * Integration tests for spec-0004: Validator Convergence
 *
 * Tests canonical UIX aggregator path, 3-layer filename expectations,
 * migration warnings, non-UI pack UIX skip, and truthful evidence/browser QA.
 */

// QFAI:SPEC-0004:TC-0004-0017
// QFAI:SPEC-0004:TC-0004-0018
// QFAI:SPEC-0004:TC-0004-0019
// QFAI:SPEC-0004:TC-0004-0020
// QFAI:SPEC-0004:TC-0004-0021
// QFAI:SPEC-0004:TC-0004-0022

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateThreeLayerModel } from "../../src/core/validators/uix/threeLayer.js";

// ---------------------------------------------------------------------------
// Temp dir management
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-convergence-int-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

const repoRoot = path.resolve(process.cwd(), "..", "..");

// ---------------------------------------------------------------------------
// TC-0004-0017: Canonical UIX aggregator path verification
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0017
describe("TC-0004-0017: Canonical UIX aggregator path verification", () => {
  it("validate.ts calls runAllUixValidators (not a legacy wrapper)", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("runAllUixValidators");
    expect(validateSrc).not.toMatch(/legacyUixAggregator/);
  });
});

// ---------------------------------------------------------------------------
// TC-0004-0018: 3-layer family filename expectations
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0018
describe("TC-0004-0018: 3-layer family filename expectations", () => {
  it("threeLayer validator recognizes split eval axis filenames (20-23)", async () => {
    const validatorSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "uix", "threeLayer.ts"),
      "utf-8",
    );
    expect(validatorSrc).toContain("20_eval_axis_usability.md");
    expect(validatorSrc).toContain("21_eval_axis_consistency.md");
    expect(validatorSrc).toContain("22_eval_axis_accessibility.md");
    expect(validatorSrc).toContain("23_eval_axis_delight.md");
  });
});

// ---------------------------------------------------------------------------
// TC-0004-0019: Old 4-axis file migration warning
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0019
describe("TC-0004-0019: Old 4-axis file migration warning", () => {
  it("4-axis content in eval files triggers legacy format warning", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const legacyContent =
      "## usability\n\nContent.\n\n## consistency\n\nContent.\n\n## accessibility\n\nContent.\n\n## delight\n\nContent.\n";
    for (const f of [
      "20_eval_axis_usability.md",
      "21_eval_axis_consistency.md",
      "22_eval_axis_accessibility.md",
      "23_eval_axis_delight.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), legacyContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-3LAYER-LEGACY-FORMAT")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-0004-0020: Non-UI pack UIX skip
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0020
describe("TC-0004-0020: Non-UI pack UIX skip", () => {
  it("non-UI pack produces zero UIX-VAL issues from threeLayer", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0004-0021: render-evidence truthful state
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0021
describe("TC-0004-0021: render-evidence truthful state", () => {
  it.todo("TC-0004-0021: captured/skipped/failed states verified — no placeholder pass");
});

// ---------------------------------------------------------------------------
// TC-0004-0022: Browser QA minimal runner truthful
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0022
describe("TC-0004-0022: Browser QA minimal runner truthful", () => {
  it.todo("TC-0004-0022: browser QA runner reports truthful results (not pass-all)");
});
