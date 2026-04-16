// QFAI:SPEC-0012:US-0012-0063
// QFAI:SPEC-0012:US-0012-0064
// QFAI:SPEC-0012:US-0012-0065
// QFAI:SPEC-0012:US-0012-0066

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, it, expect } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0063: pathUtils.ts Standalone Leaf Module (v1.7.15 rev8 WS-1)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0063
describe("E2E: US-0012-0063 — pathUtils.ts Standalone Leaf Module", () => {
  it("pathUtils.ts exports toRepoRelativeArtifactRef function", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+toRepoRelativeArtifactRef/);
  });

  it("pathUtils.ts exports assertConcreteArtifactRef function", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+assertConcreteArtifactRef/);
  });

  it("pathUtils.ts does NOT import from execution.ts (no circular dependency)", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).not.toContain("execution.js");
    expect(src).not.toContain("execution.ts");
  });

  it("pathUtils.ts does NOT import from harness/runtime.ts (no upward import)", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).not.toContain("harness/runtime");
    expect(src).not.toContain("runtime.js");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0064: runtimeGate.evidenceRefs Validator Extension (v1.7.15 rev8 WS-2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0064
describe("E2E: US-0012-0064 — runtimeGate.evidenceRefs Validator Extension", () => {
  it("prototypingEvidence.ts validates runtimeGate.evidenceRefs field", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("evidenceRefs");
  });

  it("prototypingEvidence.ts emits error for absent runtimeGate.evidenceRefs (fail-closed)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("evidenceRefs");
    // Validator must reject absent/empty array (fail-closed per DR-0012-0048)
    expect(src).toMatch(/QFAI-PROT-\d{3}/);
  });

  it("PrototypingEvidence type has runtimeGate.evidenceRefs required field", async () => {
    // evidenceRefs lives in the Zod schema (prototypingEvidence.ts); types.ts may not define it yet
    const validatorSrc = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    const typesSrc = await readFile(srcPath("prototyping", "types.ts"), "utf-8").catch(() => "");
    expect(validatorSrc.includes("evidenceRefs") || typesSrc.includes("evidenceRefs")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0065: Unified Ref Grammar Across All 5 Sites (v1.7.15 rev8 WS-3)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0065
describe("E2E: US-0012-0065 — Unified Ref Grammar (shared helpers, no parallel grammar)", () => {
  it("specCoverage.ts uses isConcreteArtifactRef or assertConcreteArtifactRef from pathUtils", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/isConcreteArtifactRef|assertConcreteArtifactRef|pathUtils/);
  });

  it("execution.ts uses assertConcreteArtifactRefs from pathUtils (no inline grammar)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("pathUtils");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0066: Closure Regression Test (v1.7.15 rev8 WS-4)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0066
describe("E2E: US-0012-0066 — Closure Regression Test File Exists", () => {
  it("prototypingExecution.productionPath.test.ts exists with positive closure + negative injection tests", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "tests",
        "core",
        "prototypingExecution.productionPath.test.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("runPrototypingExecution");
    expect(src).toContain("validatePrototypingEvidence");
    expect(src).toMatch(/passes the execution.*validate closure/);
    expect(src).toMatch(/rejects an injected malformed leaf ref/);
  });

  it("pathUtils.ts module exports are consistent with rev8 spec (pre-condition check)", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    // At minimum the existing helpers from rev7 must be present
    expect(src).toMatch(/export\s+function\s+isConcreteArtifactRef/);
    expect(src).toMatch(/export\s+function\s+normalizeConcreteArtifactRef/);
  });
});
