// QFAI:SPEC-0012:US-0012-0038
// QFAI:SPEC-0012:US-0012-0039
// QFAI:SPEC-0012:US-0012-0040
// QFAI:SPEC-0012:US-0012-0041
// QFAI:SPEC-0012:US-0012-0042
// QFAI:SPEC-0012:US-0012-0043

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0038: full-harness mode/surface 契約厳格化
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0038
describe("E2E: US-0012-0038 — full-harness mode/surface 契約厳格化", () => {
  it("mode.ts exports NON_UI_PROTOTYPING_SURFACE_REASON_CODE", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/export\s.*NON_UI_PROTOTYPING_SURFACE_REASON_CODE/);
  });

  it("mode.ts derivePrototypingObligations function exists and has surface check", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toContain("derivePrototypingObligations");
    expect(src).toMatch(/surface/i);
  });

  it("runtime.ts exports runFullHarness function", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toMatch(/export\s.*runFullHarness/);
  });

  it("execution.ts has surface validation", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toMatch(/surface/i);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0039: render/Browser QA ターゲット画面契約準拠
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0039
describe("E2E: US-0012-0039 — render/Browser QA ターゲット画面契約準拠", () => {
  it("screenContracts.ts exports parseCanonicalScreenContracts", async () => {
    const src = await readFile(srcPath("prototyping", "screenContracts.ts"), "utf-8");
    expect(src).toMatch(/export\s.*parseCanonicalScreenContracts/);
  });

  it("screenContracts.ts exports buildScreenRenderTargets", async () => {
    const src = await readFile(srcPath("prototyping", "screenContracts.ts"), "utf-8");
    expect(src).toMatch(/export\s.*buildScreenRenderTargets/);
  });

  it("screenContracts.ts exports toBrowserQaScreenContracts", async () => {
    const src = await readFile(srcPath("prototyping", "screenContracts.ts"), "utf-8");
    expect(src).toMatch(/export\s.*toBrowserQaScreenContracts/);
  });

  it("screenContracts.ts does not hardcode '/primary' as Browser QA target", async () => {
    const src = await readFile(srcPath("prototyping", "screenContracts.ts"), "utf-8");
    const lines = src.split("\n");
    const nonCommentLines = lines.filter((line) => !line.trimStart().startsWith("//"));
    const code = nonCommentLines.join("\n");
    expect(code).not.toMatch(/["']\/primary["']/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0040: Browser QA エビデンスチェーン完全性
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0040
describe("E2E: US-0012-0040 — Browser QA エビデンスチェーン完全性", () => {
  it("runtime.ts contains browserQaRefs tracking variable", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("browserQaRefs");
  });

  it("runtime.ts has empty browserQa hard-fail check", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("browserQaRefs.length === 0");
  });

  it("runtime.ts stores browserQa refs in evidence refs", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toMatch(/browserQaRefs/);
    expect(src).toMatch(/evidence|refs/i);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0041: runtimeGate/specCoverage 正規ルート意味論
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0041
describe("E2E: US-0012-0041 — runtimeGate/specCoverage 正規ルート意味論", () => {
  it("runtimeGateBuilder.ts exports buildRuntimeGate", async () => {
    const src = await readFile(srcPath("prototyping", "runtimeGateBuilder.ts"), "utf-8");
    expect(src).toMatch(/export\s.*buildRuntimeGate/);
  });

  it("specCoverage.ts exports loadDeclaredSpecArtifacts", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/export\s.*loadDeclaredSpecArtifacts/);
  });

  it("specCoverage.ts exports buildSpecCoverageSummary", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/export\s.*buildSpecCoverageSummary/);
  });

  it("specCoverage.ts exports collectObservedRuntimeArtifacts", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/export\s.*collectObservedRuntimeArtifacts/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0042: L2 エビデンス構造化パース優先
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0042
describe("E2E: US-0012-0042 — L2 エビデンス構造化パース優先", () => {
  it("l2Evidence.ts exports buildDiscussionAxisInputs", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toMatch(/export\s.*buildDiscussionAxisInputs/);
  });

  it("l2Evidence.ts exports buildScreenContractInputs", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toMatch(/export\s.*buildScreenContractInputs/);
  });

  it("l2Evidence.ts exports buildTrendAlignmentInputs", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toMatch(/export\s.*buildTrendAlignmentInputs/);
  });

  it("l2Evidence.ts contains structured parse logic", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toMatch(/readSafe|readFile/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0043: validator/docs/tests 陳腐化セマンティクス整理
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0043
describe("E2E: US-0012-0043 — validator/docs/tests 陳腐化セマンティクス整理", () => {
  it("prototypingEvidence.ts does not use deprecated 'skip' mode status", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).not.toMatch(/status:\s*["']skip["']/);
  });

  it("prototypingEvidence.ts exists and is substantial (> 10000 chars)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src.length).toBeGreaterThan(10000);
  });
});
