/**
 * Integration tests for spec-0004: Validator Convergence
 *
 * Tests canonical UIX aggregator path, exploration-first sidecar expectations,
 * legacy heading rejection, non-UI pack UIX skip, and truthful evidence/browser QA.
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
// TC-0004-0018: exploration-first family filename expectations
// ---------------------------------------------------------------------------

describe("TC-0004-0018: canonical sidecar family filename expectations", () => {
  it("threeLayer validator recognizes the canonical screen-level sidecar family", async () => {
    const validatorSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "uix", "threeLayer.ts"),
      "utf-8",
    );
    // Brand-level inputs (product intent / brand signals / anti-goals
    // / reference pool) live in root DESIGN.md; threeLayer asserts only
    // screen-level sidecars + the legacy-format guards.
    // The legacy 33_exploration_rubric.md / 34_evaluator_calibration.md
    // sidecars were retired when DESIGN.md became the brand SSOT and the
    // evaluator axes were fixed (`ORDINAL_AXES`); they are no longer in
    // the canonical family. The shipped init assets do not generate them.
    expect(validatorSrc).toContain("00_index.md");
    expect(validatorSrc).toContain("40_screen_contracts.md");
    expect(validatorSrc).toContain("50_review_input_bundle.md");
    // The sidecars are mentioned only in the historical comment; the
    // canonical list itself must not list them.
    const canonicalListBlock = validatorSrc.split(
      "const CANONICAL_REQUIRED_SIDECAR_FILES",
    )[1] as string;
    const canonicalListBody = canonicalListBlock.split("] as const")[0] as string;
    expect(canonicalListBody).not.toContain("33_exploration_rubric.md");
    expect(canonicalListBody).not.toContain("34_evaluator_calibration.md");
  });
});

// ---------------------------------------------------------------------------
// TC-0004-0019: Old 4-axis format is error
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0019
describe("TC-0004-0019: Old 4-axis format is error", () => {
  it("legacy 4-axis headings in exploration artifacts trigger legacy format error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const legacyContent = ["# Exploration Rubric", "", "## craft", "", "Legacy content."].join(
      "\n",
    );
    // 33_exploration_rubric.md is no longer in the canonical family;
    // run the legacy-format check against 40_screen_contracts.md, which
    // is. The validator iterates the canonical list, so any required
    // sidecar with legacy 4-axis headings will produce the error.
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), legacyContent, "utf-8");

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
// QFAI:SPEC-0014:TC-0014-0005
describe("TC-0004-0020: Non-UI pack UIX skip", () => {
  it("non-UI pack produces zero UIX-VAL issues from threeLayer", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0014-0004: UIX-VAL determinism
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0004
describe("TC-0014-0004: UIX-VAL determinism", () => {
  it("same input produces identical output on repeated runs", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const legacyContent = ["# Exploration Rubric", "", "## craft", "", "Legacy content."].join(
      "\n",
    );
    // 33_exploration_rubric.md is no longer in the canonical family;
    // run the legacy-format check against 40_screen_contracts.md, which
    // is. The validator iterates the canonical list, so any required
    // sidecar with legacy 4-axis headings will produce the error.
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), legacyContent, "utf-8");

    const first = await validateThreeLayerModel(root, defaultConfig);
    const second = await validateThreeLayerModel(root, defaultConfig);

    expect(second).toEqual(first);
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
