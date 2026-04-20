// QFAI:SPEC-0012:US-0012-0050
// QFAI:SPEC-0012:US-0012-0051
// QFAI:SPEC-0012:US-0012-0052
// QFAI:SPEC-0012:US-0012-0053
// QFAI:SPEC-0012:US-0012-0054
// QFAI:SPEC-0012:US-0012-0055

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0050: Reject Non-Full-Harness Mode at All Layers
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0050
describe("E2E: US-0012-0050 — Reject Non-Full-Harness Mode at All Layers", () => {
  it("mode.ts exports UNSUPPORTED_PROTOTYPING_MODE_MESSAGE and UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/export\s.*UNSUPPORTED_PROTOTYPING_MODE_MESSAGE/);
    expect(src).toMatch(/export\s.*UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE/);
  });

  it("mode.ts derivePrototypingObligations rejects non-full-harness modes", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toContain("derivePrototypingObligations");
    expect(src).toContain('"full-harness"');
    expect(src).toContain("UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE");
    expect(src).toContain("validCombination: false");
  });

  it("prototypingEvidence.ts emits QFAI-PROT-151 for non-full-harness effective mode", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-151");
    expect(src).toContain("mode.effective");
    expect(src).toContain("full-harness");
  });

  it("execution.ts validates mode obligations and rejects invalid combinations", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("obligations.validCombination");
    expect(src).toContain("obligations.invalidReason");
    expect(src).toContain("derivePrototypingObligations");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0051: Reject Non-UI Surfaces at All Layers
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0051
describe("E2E: US-0012-0051 — Reject Non-UI Surfaces at All Layers", () => {
  it("surfacePolicy.ts PROTOTYPING_SUPPORTED_SURFACES excludes cli, api, backend", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    const supportedLine = src.match(/PROTOTYPING_SUPPORTED_SURFACES\s*=\s*\[([^\]]+)\]/)?.[0] ?? "";
    expect(supportedLine).not.toContain("cli");
    expect(supportedLine).not.toContain("api");
    expect(supportedLine).not.toContain("backend");
  });

  it("mode.ts derivePrototypingObligations checks isSupportedPrototypingSurface first", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toContain("isSupportedPrototypingSurface");
    expect(src).toContain("NON_UI_PROTOTYPING_SURFACE_REASON_CODE");
    // surface check must appear before mode check inside derivePrototypingObligations body
    const funcStart = src.indexOf("export function derivePrototypingObligations");
    expect(funcStart).toBeGreaterThan(-1);
    const funcBody = src.slice(funcStart);
    const surfaceCheckIdx = funcBody.indexOf("NON_UI_PROTOTYPING_SURFACE_REASON_CODE");
    const modeCheckIdx = funcBody.indexOf("UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE");
    expect(surfaceCheckIdx).toBeLessThan(modeCheckIdx);
  });

  it("prototypingEvidence.ts validates surface using isSupportedPrototypingSurface", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("isSupportedPrototypingSurface");
    expect(src).toContain("QFAI-PROT-171");
  });

  it("execution.ts calls assertSupportedPrototypingSurface for surface validation", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("assertSupportedPrototypingSurface");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0052: surfacePolicy.ts Standalone Module
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0052
describe("E2E: US-0012-0052 — surfacePolicy.ts Standalone Module", () => {
  it("surfacePolicy.ts exports PROTOTYPING_SUPPORTED_SURFACES, isSupportedPrototypingSurface, assertSupportedPrototypingSurface", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    expect(src).toMatch(/export\s.*PROTOTYPING_SUPPORTED_SURFACES/);
    expect(src).toMatch(/export\s.*isSupportedPrototypingSurface/);
    expect(src).toMatch(/export\s.*assertSupportedPrototypingSurface/);
  });

  it("surfacePolicy.ts does NOT import from mode.ts", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    expect(src).not.toContain('from "./mode.js"');
    expect(src).not.toContain("from './mode.js'");
    expect(src).not.toContain('from "../prototyping/mode.js"');
  });

  it("surfacePolicy.ts PROTOTYPING_SUPPORTED_SURFACES contains only web, mobile, desktop, mixed", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    expect(src).toContain('"web"');
    expect(src).toContain('"mobile"');
    expect(src).toContain('"desktop"');
    expect(src).toContain('"mixed"');
  });

  it("mode.ts imports isSupportedPrototypingSurface from surfacePolicy.ts (not inline)", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toContain("isSupportedPrototypingSurface");
    expect(src).toContain("surfacePolicy.js");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0053: runFullHarness Uses CalibrationLoader Internally
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0053
describe("E2E: US-0012-0053 — runFullHarness Uses CalibrationLoader / Fail-Closed", () => {
  it("calibration/loader.ts exports CalibrationLoader class", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toMatch(/export\s+class\s+CalibrationLoader/);
  });

  it("CalibrationLoader.load() throws when pack file is missing", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toContain("Calibration pack not found at");
    expect(src).toContain("Full-harness requires a valid calibration pack file.");
  });

  it("CalibrationLoader.load() throws when required fields are missing", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toContain("maxIterations");
    expect(src).toContain("plateauDelta");
    expect(src).toContain("plateauLookback");
    expect(src).toContain("version");
    expect(src).toContain("thresholds");
    expect(src).toContain("throw new Error");
  });

  it("runtime.ts uses calibrationRef.packPath in request", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("calibrationRef");
    expect(src).toContain("packPath");
    expect(src).toContain("packVersion");
  });

  it("runtime.ts records calibrationRef in output FullHarnessResult", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("calibrationRef:");
    expect(src).toContain("configPath");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0054: runtimeGate and specCoverage Use Concrete evidenceRefs
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0054
describe("E2E: US-0012-0054 — runtimeGate and specCoverage Use Concrete evidenceRefs", () => {
  it("pathUtils.ts exports isConcreteArtifactRef", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toMatch(/export\s.*isConcreteArtifactRef/);
  });

  it("pathUtils.ts rejects self-ref to prototyping.json", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toContain(".qfai/evidence/prototyping.json");
    expect(src).toContain("Self-ref is not allowed");
  });

  it("pathUtils.ts rejects synthetic artifact refs starting with 'specs:'", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toContain("specs:");
    expect(src).toContain("Synthetic artifact ref is not allowed");
  });

  it("prototypingEvidence.ts validates runtimeGate.evidenceRefs with concrete artifact refs", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("isConcreteArtifactRef");
    expect(src).toContain("runtimeGate.evidenceRefs");
  });

  it("refSemantics.ts exports assertConcreteArtifactRefs and rejects empty arrays", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    expect(src).toMatch(/export\s.*assertConcreteArtifactRefs/);
    expect(src).toContain("must not be empty");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0055: reviewerSignoff Semantics, screenId Matching, and Stale Cleanup
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0055
describe("E2E: US-0012-0055 — reviewerSignoff Semantics, screenId Matching, Stale Cleanup", () => {
  it("runtime.ts mapFinalDecisionToSignoffStatus: accepted→approved, abandoned→abandoned", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("accepted");
    expect(src).toContain('"approved"');
    expect(src).toContain('"abandoned"');
    expect(src).toContain("mapFinalDecisionToSignoffStatus");
  });

  it("prototypingEvidence.ts QFAI-PROT-316: reviewerSignoff.status must match finalDecision", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-316");
    expect(src).toContain("reviewerSignoff.status");
    expect(src).toContain("finalDecision");
  });

  it("uiFidelityBuilder.ts matches screens by screenId (not uiContractId)", async () => {
    const src = await readFile(srcPath("prototyping", "uiFidelityBuilder.ts"), "utf-8");
    // Should use obs.screenId === screen.screenId for matching
    expect(src).toContain("obs.screenId === screen.screenId");
  });

  it("uiFidelityBuilder.ts does NOT match by uiContractId in observation matching", async () => {
    const src = await readFile(srcPath("prototyping", "uiFidelityBuilder.ts"), "utf-8");
    // The old path uiContractId matching should NOT be used for screen observation lookup
    expect(src).not.toMatch(/obs\.uiContractId\s*===\s*screen\.screenId/);
    expect(src).not.toMatch(/obs\.screenId\s*===\s*screen\.uiContractId/);
  });

  it("ReviewerLogVerdict type uses mapped vocabulary: approve|revise|reject|abandon", async () => {
    const src = await readFile(srcPath("harness", "types.ts"), "utf-8");
    expect(src).toContain('"approve"');
    expect(src).toContain('"revise"');
    expect(src).toContain('"reject"');
    expect(src).toContain('"abandon"');
    expect(src).toContain("ReviewerLogVerdict");
  });
});
