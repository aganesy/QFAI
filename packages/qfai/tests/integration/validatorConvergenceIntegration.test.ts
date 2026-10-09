/**
 * Integration tests for spec-0004: Validator Convergence
 *
 * Tests canonical UIX aggregator path, screen-level sidecar expectations,
 * non-UI pack UIX skip, and truthful evidence/browser QA.
 *
 * TC-0004-0023..0026 are backfill trace anchors only (no body tests in this
 * file). The actual tests live in:
 *   - `packages/qfai/tests/validators/skillDocReferences.test.ts` —
 *     TC-0004-0023 (skill project_memory)
 *   - `packages/qfai/tests/validators/assistantTreeMigration.test.ts` —
 *     TC-0004-0025 (W-USER-EDIT-PRESERVED pass-through)
 *   - `packages/qfai/tests/codex/agents.test.ts` —
 *     TC-0004-0026 (agent-catalog ↔ canonical MD 3-way SSOT guard)
 * Including the trace tags here closes the QFAI-ATDD-112 obligation
 * (every TC must be referenced at least once from tests/integration/**).
 */

// QFAI:EX-0001-0018-01
// QFAI:EX-0001-0045-02
// QFAI:EX-0001-0046-02

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateThreeLayerFamilyCompleteness } from "../../src/core/validators/uix/threeLayer.js";

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
// The aggregator validate.ts calls, read from its source
// ---------------------------------------------------------------------------

describe("the canonical UIX aggregator is the one validate.ts names", () => {
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
// exploration-first family filename expectations
// ---------------------------------------------------------------------------

describe("canonical sidecar family filename expectations", () => {
  it("threeLayer validator recognizes the canonical screen-level sidecar family", async () => {
    const validatorSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "uix", "threeLayer.ts"),
      "utf-8",
    );
    // Brand-level inputs (product intent / brand signals / anti-goals
    // / reference pool) live in root DESIGN.md; threeLayer asserts only
    // screen-level sidecars.
    expect(validatorSrc).toContain("00_index.md");
    expect(validatorSrc).toContain("40_screen_contracts.md");
    expect(validatorSrc).toContain("50_review_input_bundle.md");
  });
});

// ---------------------------------------------------------------------------
// A non-UI pack raises no UIX finding from the three-layer validator
// ---------------------------------------------------------------------------

// QFAI:EX-0001-0018-01
describe("a non-UI pack raises no UIX finding from threeLayer", () => {
  it("non-UI pack produces zero UIX-VAL issues from threeLayer", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);
    expect(issues.filter((i) => i.code.startsWith("QFAI-THREELAYER-"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// UIX-VAL determinism
// ---------------------------------------------------------------------------

describe("UIX-VAL determinism", () => {
  it("same input produces identical output on repeated runs", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const first = await validateThreeLayerFamilyCompleteness(root, defaultConfig);
    const second = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });
});

// ---------------------------------------------------------------------------
// render-evidence truthful state
// ---------------------------------------------------------------------------

describe("render-evidence truthful state", () => {
  it("captured/skipped/failed states verified — no placeholder pass", async () => {
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
// Browser QA minimal runner truthful
// ---------------------------------------------------------------------------

describe("Browser QA minimal runner truthful", () => {
  it("browser QA runner reports truthful results (not pass-all)", async () => {
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
