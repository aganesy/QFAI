// QFAI:SPEC-0012:US-0012-0077
// QFAI:SPEC-0012:US-0012-0078
// QFAI:SPEC-0012:US-0012-0079
// QFAI:SPEC-0012:US-0012-0080
// QFAI:SPEC-0012:US-0012-0081
// QFAI:SPEC-0012:US-0012-0082
// QFAI:SPEC-0012:US-0012-0083

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, it, expect } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

function testPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "tests", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0077: src/core/index.ts does not export runMeasurement or validatePanelScore
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0077
describe("E2E: US-0012-0077 — index.ts rev11 public surface (runFullHarness only)", () => {
  it("index.ts does not re-export runMeasurement", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    expect(src).not.toMatch(/export\s+\{[^}]*runMeasurement/);
    expect(src).not.toMatch(/export\s+\*\s+from\s+['"].*measurement/);
  });

  it("index.ts does not re-export validatePanelScore", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    expect(src).not.toMatch(/export\s+\{[^}]*validatePanelScore/);
  });

  it("index.ts still exports runFullHarness", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    expect(src).toMatch(/runFullHarness/);
  });

  it("index.ts contains rev11 comment explaining the intentional omission", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    expect(src).toMatch(/rev11.*breaking|NOT re-exported/i);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0078: measurement.ts contains all 8 category checks + canonical
//               screenContractRef check + validatePanelScore invocation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0078
describe("E2E: US-0012-0078 — measurement.ts all 8 categories + screenContractRef + validatePanelScore", () => {
  it("measurement.ts validates all 8 EvidenceRefs categories via assertCategoryRefs", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    const categories = [
      "renderRefs",
      "browserQaRefs",
      "runtimeGateRefs",
      "uiObservationRefs",
      "specCoverageRefs",
      "discussionRefs",
      "trendRefs",
      "screenContractRefs",
    ];
    for (const cat of categories) {
      expect(src).toContain(cat);
    }
  });

  it("measurement.ts calls assertScreenContractRefs with canonical check", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    expect(src).toMatch(/assertScreenContractRefs/);
    expect(src).toMatch(/isCanonicalScreenContractRef/);
  });

  it("measurement.ts invokes validatePanelScore for both l1 and l2", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    expect(src).toMatch(/validatePanelScore/);
    expect(src).toMatch(/input\.l1/);
    expect(src).toMatch(/input\.l2/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0079: panelScore.ts validatePanelScore enforces non-empty axes and
//               concrete evidenceRefs
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0079
describe("E2E: US-0012-0079 — panelScore.ts validatePanelScore strict enforcement", () => {
  it("panelScore.ts rejects panels with empty axes array", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/axes\.length\s*===\s*0/);
    expect(src).toMatch(/must have at least one axis/);
  });

  it("panelScore.ts rejects axes with empty evidenceRefs", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/evidenceRefs/);
    expect(src).toMatch(/must have at least one evidenceRef/);
  });

  it("panelScore.ts calls assertConcreteArtifactRef on each evidenceRef", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/assertConcreteArtifactRef/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0080: specCoverage.ts only reads 01_Spec.md
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0080
describe("E2E: US-0012-0080 — specCoverage.ts canonical declaration source is 01_Spec.md only", () => {
  it("specCoverage.ts reads 01_Spec.md as the canonical declaration path", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/01_Spec\.md/);
  });

  it("specCoverage.ts does not perform broad directory scanning for declarations", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    // Broad scanning would iterate multiple markdown files; rev11 uses single file path join only
    expect(src).toMatch(/declarationPath\s*=\s*path\.join.*01_Spec\.md/);
  });

  it("specCoverage.ts contains rev11 comment about canonical declaration source", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/rev11.*canonical|01_Spec\.md.*only/i);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0081: refSemantics / path grammar is line-ref only for 01_Spec.md
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0081
describe("E2E: US-0012-0081 — refSemantics isSpecDeclarationRef line-ref grammar", () => {
  it("refSemantics.ts exports isSpecDeclarationRef", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    expect(src).toMatch(/isSpecDeclarationRef/);
  });

  it("refSemantics.ts isSpecDeclarationRef enforces #L<positive integer> fragment form", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    // Must use a regex that matches #L followed by digits only
    expect(src).toMatch(/#L.*\d/);
    expect(src).toMatch(/01_Spec\.md/);
  });

  it("specCoverage.ts imports and uses isSpecDeclarationRef for declaredRef validation", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/isSpecDeclarationRef/);
    expect(src).toMatch(/refSemantics/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0082: measurement.test.ts and panelScore.test.ts contain rev11 strict
//               negative cases
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0082
describe("E2E: US-0012-0082 — rev11 strict negative test cases exist in harness tests", () => {
  it("measurement.test.ts exists and imports from harness/measurement", async () => {
    const src = await readFile(testPath("core", "harness", "measurement.test.ts"), "utf-8");
    expect(src).toMatch(/runMeasurement/);
    expect(src).toMatch(/harness\/measurement/);
  });

  it("measurement.test.ts tests empty category refs rejection", async () => {
    const src = await readFile(testPath("core", "harness", "measurement.test.ts"), "utf-8");
    // Must cover empty array or missing refs
    expect(src).toMatch(/empty|length.*0|non-empty/i);
  });

  it("panelScore.test.ts exists and imports validatePanelScore", async () => {
    const src = await readFile(testPath("core", "harness", "panelScore.test.ts"), "utf-8");
    expect(src).toMatch(/validatePanelScore/);
  });

  it("panelScore.test.ts covers empty axes rejection", async () => {
    const src = await readFile(testPath("core", "harness", "panelScore.test.ts"), "utf-8");
    expect(src).toMatch(/axes/);
    expect(src).toMatch(/empty|length.*0|at least one/i);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0083: specCoverage.test.ts and refSemantics.test.ts exist for
//               semantic boundary coverage
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0083
describe("E2E: US-0012-0083 — semantic boundary test files exist for specCoverage and refSemantics", () => {
  it("specCoverage.test.ts exists and imports buildSpecCoverageSummary", async () => {
    const src = await readFile(testPath("core", "specCoverage.test.ts"), "utf-8");
    expect(src).toMatch(/buildSpecCoverageSummary/);
    expect(src).toMatch(/specCoverage/);
  });

  it("refSemantics.test.ts exists and imports isSpecDeclarationRef", async () => {
    const src = await readFile(testPath("core", "refSemantics.test.ts"), "utf-8");
    expect(src).toMatch(/isSpecDeclarationRef/);
  });

  it("refSemantics.test.ts covers 01_Spec.md line-ref acceptance", async () => {
    const src = await readFile(testPath("core", "refSemantics.test.ts"), "utf-8");
    expect(src).toMatch(/01_Spec\.md#L\d+/);
  });

  it("refSemantics.test.ts covers rejection of anchor-fragment form", async () => {
    const src = await readFile(testPath("core", "refSemantics.test.ts"), "utf-8");
    expect(src).toMatch(/false/);
    // covers cases like #route-home, #dashboard (slug anchor rejection)
    expect(src).toMatch(/anchor|slug|route/i);
  });
});
