// QFAI:SPEC-0012:US-0012-0044
// QFAI:SPEC-0012:US-0012-0045
// QFAI:SPEC-0012:US-0012-0046
// QFAI:SPEC-0012:US-0012-0047
// QFAI:SPEC-0012:US-0012-0048
// QFAI:SPEC-0012:US-0012-0049

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0044: non-UI surface prototyping 全モード拒否
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0044
describe("E2E: US-0012-0044 — non-UI surface prototyping 全モード拒否", () => {
  it("mode.ts exports NON_UI_PROTOTYPING_SURFACE_REASON_CODE", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/export\s.*NON_UI_PROTOTYPING_SURFACE_REASON_CODE/);
  });

  it("surfacePolicy.ts PROTOTYPING_SUPPORTED_SURFACES excludes cli", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    expect(src).toContain("web");
    expect(src).toContain("mobile");
    expect(src).toContain("desktop");
    expect(src).toContain("mixed");
    // cli is NOT a supported prototyping surface
    const supportedLine = src.match(/PROTOTYPING_SUPPORTED_SURFACES\s*=\s*\[([^\]]+)\]/)?.[0] ?? "";
    expect(supportedLine).not.toContain("cli");
  });

  it("execution.ts calls assertSupportedPrototypingSurface for surface validation", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("assertSupportedPrototypingSurface");
  });

  it("derivePrototypingObligations applies NON_UI_PROTOTYPING_SURFACE_REASON_CODE for unsupported surfaces", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toContain("derivePrototypingObligations");
    expect(src).toContain("NON_UI_PROTOTYPING_SURFACE_REASON_CODE");
    expect(src).toContain("isSupportedPrototypingSurface");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0045: 観測済み route のみの runtimeGate/specCoverage
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0045
describe("E2E: US-0012-0045 — 観測済み route のみの runtimeGate/specCoverage", () => {
  it("runtimeObservation.ts returns null for unobserved screens and filters them out", async () => {
    const src = await readFile(srcPath("prototyping", "runtimeObservation.ts"), "utf-8");
    expect(src).toContain("return null");
    expect(src).toContain("entry !== null");
    expect(src).toContain(".filter(");
  });

  it("runtimeObservation.ts checks rendered and browserVisited before including a screen", async () => {
    const src = await readFile(srcPath("prototyping", "runtimeObservation.ts"), "utf-8");
    expect(src).toContain("rendered");
    expect(src).toContain("browserVisited");
  });

  it("specCoverage.ts uses uiOk array for observed route set comparison", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toContain("uiOk");
    expect(src).toContain("observed.uiOk.includes");
  });

  it("collectObservedRuntimeArtifacts is exported from specCoverage.ts", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/export\s.*collectObservedRuntimeArtifacts/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0046: Browser QA per-screen 必須化
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0046
describe("E2E: US-0012-0046 — Browser QA per-screen 必須化", () => {
  it("browserQaPerScreen.ts exports runBrowserQaPerScreen", async () => {
    const src = await readFile(srcPath("prototyping", "browserQaPerScreen.ts"), "utf-8");
    expect(src).toMatch(/export\s.*runBrowserQaPerScreen/);
  });

  it("browserQaPerScreen.ts iterates over each screen contract with for..of loop", async () => {
    const src = await readFile(srcPath("prototyping", "browserQaPerScreen.ts"), "utf-8");
    expect(src).toMatch(/for\s*\(.*screen.*of.*screenContracts/);
  });

  it("browserQaPerScreen.ts assigns screen.route to findings that lack a route", async () => {
    const src = await readFile(srcPath("prototyping", "browserQaPerScreen.ts"), "utf-8");
    expect(src).toContain("screen.route");
    expect(src).toMatch(/route.*finding\.route|finding\.route.*screen\.route/);
  });

  it("browserQaPerScreen.ts assigns screen.screenId to findings that lack screen_id", async () => {
    const src = await readFile(srcPath("prototyping", "browserQaPerScreen.ts"), "utf-8");
    expect(src).toContain("screen.screenId");
    expect(src).toMatch(/screen_id.*finding\.screen_id|finding\.screen_id.*screen\.screenId/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0047: actionsWired = action coverage セマンティクス
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0047
describe("E2E: US-0012-0047 — actionsWired = action coverage セマンティクス", () => {
  it("actionCoverage.ts exports buildActionCoverage", async () => {
    const src = await readFile(srcPath("prototyping", "actionCoverage.ts"), "utf-8");
    expect(src).toMatch(/export\s.*buildActionCoverage/);
  });

  it("actionCoverage.ts increments actionsWired only when interactionTargetResolved=true and not blocked", async () => {
    const src = await readFile(srcPath("prototyping", "actionCoverage.ts"), "utf-8");
    expect(src).toContain("interactionTargetResolved");
    expect(src).toContain("actionsWired");
    expect(src).toContain("!blocked");
    expect(src).toContain("hasInteractionTarget");
  });

  it("actionCoverage.ts ActionCoverageResult includes actionsDeclared, actionsObserved, actionsWired, missingActions", async () => {
    const src = await readFile(srcPath("prototyping", "actionCoverage.ts"), "utf-8");
    expect(src).toContain("actionsDeclared");
    expect(src).toContain("actionsObserved");
    expect(src).toContain("actionsWired");
    expect(src).toContain("missingActions");
  });

  it("actionCoverage.ts separates blocking findings from observed/wired counts", async () => {
    const src = await readFile(srcPath("prototyping", "actionCoverage.ts"), "utf-8");
    expect(src).toContain("blockingFindings");
    expect(src).toContain('severity === "error"');
  });
});

// ---------------------------------------------------------------------------
// US-0012-0048: runFullHarness() standalone fail-closed
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0048
describe("E2E: US-0012-0048 — runFullHarness() standalone fail-closed", () => {
  it("runtime.ts exports runFullHarness", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toMatch(/export\s.*runFullHarness/);
  });

  it("runtime.ts throws when adapters.surface is empty or missing", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("Full-harness requires adapters.surface");
  });

  it("runtime.ts throws when screenContracts is empty", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("Full-harness requires canonical screenContracts");
  });

  it("runtime.ts performs fail-closed check for empty browserQaRefs", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("browserQaRefs.length === 0");
    expect(src).toContain("throw new Error");
  });

  it("runtime.ts checks for successful render capture before proceeding", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("hasCapturedRender");
    expect(src).toContain("Full-harness requires successful render capture");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0049: calibration/validator/L2/docs SSOT 統合
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0049
describe("E2E: US-0012-0049 — calibration/validator/L2/docs SSOT 統合", () => {
  it("calibration/packResolver.ts exports resolveCalibrationPack", async () => {
    const src = await readFile(srcPath("calibration", "packResolver.ts"), "utf-8");
    expect(src).toMatch(/export\s.*resolveCalibrationPack/);
  });

  it("execution.ts imports resolveCalibrationPack from calibration/packResolver.js (SSOT)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("resolveCalibrationPack");
    expect(src).toContain("calibration/packResolver.js");
  });

  it("prototypingEvidence.ts imports resolveCalibrationPack from calibration/packResolver.js (SSOT)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("resolveCalibrationPack");
    expect(src).toContain("calibration/packResolver.js");
  });

  it("l2Evidence.ts imports from structuredArtifactReaders for structured parsing", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toContain("structuredArtifactReaders");
    expect(src).toMatch(/from.*structuredArtifactReaders/);
  });
});
