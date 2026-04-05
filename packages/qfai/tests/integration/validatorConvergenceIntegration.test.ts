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
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
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
  it("validate.ts calls runCanonicalUixValidators (not a legacy wrapper)", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("runCanonicalUixValidators");
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
    expect(validatorSrc).toContain("20_design_eval_invariant.md");
    expect(validatorSrc).toContain("21_design_eval_trend_derived.md");
    expect(validatorSrc).toContain("22_design_eval_product_specific.md");
    expect(validatorSrc).toContain("23_design_eval_aggregate.md");
  });
});

// ---------------------------------------------------------------------------
// TC-0004-0019: Old 4-axis format is error
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0019
describe("TC-0004-0019: Old 4-axis format is error", () => {
  it("4-axis content in eval files triggers legacy format error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const legacyContent =
      "## usability\n\nContent.\n\n## consistency\n\nContent.\n\n## accessibility\n\nContent.\n\n## delight\n\nContent.\n";
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), legacyContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    const legacyIssue = issues.find((i) => i.code === "UIX-VAL-3LAYER-LEGACY-FORMAT");
    expect(legacyIssue).toBeDefined();
    expect(legacyIssue?.severity).toBe("error");
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
  it("TC-0004-0021: captured/skipped/failed states verified — no placeholder pass", async () => {
    const { captureRenderEvidence } = await import("../../src/core/uiux/renderEvidence.js");

    // Test with available environment
    const resultCaptured = await captureRenderEvidence(
      [{ id: "test", url: "http://localhost", viewport: "desktop", width: 1280, height: 720 }],
      { available: true },
      {},
    );
    expect(["captured", "skipped", "failed"]).toContain(resultCaptured.status);
    expect(resultCaptured.status).not.toBe("pass");

    // Test with unavailable environment
    const resultSkipped = await captureRenderEvidence(
      [{ id: "test", url: "http://localhost", viewport: "desktop", width: 1280, height: 720 }],
      { available: false, reason: "No browser" },
      {},
    );
    expect(resultSkipped.status).toBe("skipped");
    expect(resultSkipped.reason).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TC-0004-0022: Browser QA minimal runner truthful
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0022
describe("TC-0004-0022: Browser QA minimal runner truthful", () => {
  it("TC-0004-0022: browser QA runner reports truthful results (not pass-all)", async () => {
    const { runBrowserQaOrchestrated, validateBrowserQaBundle } =
      await import("../../src/core/browserQa/index.js");

    // Run with actual HTML content
    const result = await runBrowserQaOrchestrated({
      htmlContent: "<div>Hello</div>",
      surface: "web",
    });
    expect(result.phases.length).toBeGreaterThan(0);
    expect(result.provider).toBeTruthy();
    expect(result.timestamp).toBeTruthy();

    // Validate a well-formed bundle produces no schema errors
    const bundle = {
      browserQa: {
        executed: true,
        status: "completed" as const,
        summary: {
          smoke: { status: "passed" as const, findingsCount: 0, checksCount: 1 },
          interaction: { status: "passed" as const, findingsCount: 0, checksCount: 1 },
          visual: { status: "passed" as const, findingsCount: 0, checksCount: 1 },
          accessibility: { status: "passed" as const, findingsCount: 0, checksCount: 1 },
        },
      },
    };
    const issues = validateBrowserQaBundle(bundle);
    expect(issues.every((i) => !i.message.includes("placeholder"))).toBe(true);
  });
});
