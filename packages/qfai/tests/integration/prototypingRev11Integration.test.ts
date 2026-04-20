// QFAI:SPEC-0012:TC-0012-0272
// QFAI:SPEC-0012:TC-0012-0273
// QFAI:SPEC-0012:TC-0012-0274
// QFAI:SPEC-0012:TC-0012-0275
// QFAI:SPEC-0012:TC-0012-0276
// QFAI:SPEC-0012:TC-0012-0277
// QFAI:SPEC-0012:TC-0012-0278
// QFAI:SPEC-0012:TC-0012-0279
// QFAI:SPEC-0012:TC-0012-0280
// QFAI:SPEC-0012:TC-0012-0281
// QFAI:SPEC-0012:TC-0012-0282
// QFAI:SPEC-0012:TC-0012-0283
// QFAI:SPEC-0012:TC-0012-0284

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

function testPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "tests", ...segments);
}

// ---------------------------------------------------------------------------
// TC-0012-0272: index.ts export removal verified
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0272
describe("Integration TC-0012-0272: index.ts export removal verified", () => {
  it("index.ts source contains no named re-export of runMeasurement", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    expect(src).not.toMatch(/export\s+\{[^}]*runMeasurement/);
    expect(src).not.toMatch(/export\s+\*\s+from\s+['"].*measurement/);
  });

  it("index.ts source contains no named re-export of validatePanelScore", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    expect(src).not.toMatch(/export\s+\{[^}]*validatePanelScore/);
  });

  it("index.ts still exports runFullHarness as public API", async () => {
    const src = await readFile(srcPath("index.ts"), "utf-8");
    expect(src).toMatch(/runFullHarness/);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0273..0276: measurement.ts rev11 strict validation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0273
describe("Integration TC-0012-0273: runMeasurement accepts all 8 categories with strict validation", () => {
  it("measurement.ts calls assertCategoryRefs for all 8 input ref fields", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    const fields = [
      "renderRefs",
      "browserQaRefs",
      "runtimeGateRefs",
      "uiObservationRefs",
      "specCoverageRefs",
      "discussionRefs",
      "trendRefs",
      "screenContractRefs",
    ];
    for (const field of fields) {
      expect(src).toContain(field);
    }
  });

  it("measurement.ts invokes validatePanelScore for both input.l1 and input.l2", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    expect(src).toMatch(/validatePanelScore\s*\(\s*input\.l1/);
    expect(src).toMatch(/validatePanelScore\s*\(\s*input\.l2/);
  });
});

// QFAI:SPEC-0012:TC-0012-0274
describe("Integration TC-0012-0274: runMeasurement rejects empty category ref array", () => {
  it("measurement.ts rejects empty or non-array category refs in assertCategoryRefs", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    expect(src).toMatch(/!Array\.isArray\(refs\)\s*\|\|\s*refs\.length\s*===\s*0/);
    expect(src).toMatch(/requires non-empty .* evidence refs/i);
  });
});

// QFAI:SPEC-0012:TC-0012-0275
describe("Integration TC-0012-0275: runMeasurement rejects non-canonical screenContractRef", () => {
  it("measurement.ts enforces canonical screenContractRef via isCanonicalScreenContractRef", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    expect(src).toMatch(/assertScreenContractRefs/);
    expect(src).toMatch(/isCanonicalScreenContractRef/);
    expect(src).toMatch(/40_screen_contracts\.md/);
  });
});

// QFAI:SPEC-0012:TC-0012-0276
describe("Integration TC-0012-0276: runMeasurement rejects empty l1.axes before computation proceeds", () => {
  it("measurement.ts validates panels before reviewer/commit/weighted total computation", async () => {
    const src = await readFile(srcPath("harness", "measurement.ts"), "utf-8");
    const l1Check = src.indexOf("validatePanelScore(input.l1)");
    const weightedTotal = src.indexOf("const weightedTotal = computeWeightedTotal");
    const reviewer = src.indexOf("const reviewer = validateReviewer");
    expect(l1Check).toBeGreaterThan(-1);
    expect(weightedTotal).toBeGreaterThan(-1);
    expect(reviewer).toBeGreaterThan(-1);
    expect(l1Check).toBeLessThan(weightedTotal);
    expect(l1Check).toBeLessThan(reviewer);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0277..0278: panelScore.ts validatePanelScore strict rules
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0277
describe("Integration TC-0012-0277: validatePanelScore rejects empty axes", () => {
  it("panelScore.ts validatePanelScore source checks for axes.length === 0", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/axes\.length\s*===\s*0/);
    expect(src).toMatch(/must have at least one axis/);
  });
});

// QFAI:SPEC-0012:TC-0012-0278
describe("Integration TC-0012-0278: validatePanelScore rejects empty or non-concrete evidenceRefs", () => {
  it("panelScore.ts validatePanelScore checks per-axis evidenceRefs length", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/evidenceRefs.*length\s*===\s*0|!Array\.isArray.*evidenceRefs/);
    expect(src).toMatch(/must have at least one evidenceRef/);
  });

  it("panelScore.ts imports and calls assertConcreteArtifactRef on each evidenceRef", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/assertConcreteArtifactRef/);
    expect(src).toMatch(/pathUtils/);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0279..0281: specCoverage / refSemantics semantic closure
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0279
describe("Integration TC-0012-0279: specCoverage ignores notes.md and appendix.md", () => {
  it("specCoverage.test.ts covers notes.md / appendix.md as ignored declaration sources", async () => {
    const src = await readFile(testPath("core", "specCoverage.test.ts"), "utf-8");
    expect(src).toMatch(/notes\.md/);
    expect(src).toMatch(/appendix\.md/);
    expect(src).toMatch(/not\.toContain/);
  });

  it("specCoverage.ts constructs declarationPath pointing at 01_Spec.md only", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/declarationPath\s*=\s*path\.join.*01_Spec\.md/);
  });
});

// QFAI:SPEC-0012:TC-0012-0280
describe("Integration TC-0012-0280: isSpecDeclarationRef accepts positive line-ref grammar", () => {
  it("refSemantics.ts defines line-ref-only regex for 01_Spec.md", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    expect(src).toContain("01_Spec\\.md#L[1-9]\\d*$");
  });

  it("refSemantics.test.ts covers acceptance of .qfai/specs/<id>/01_Spec.md#L<n>", async () => {
    const src = await readFile(testPath("core", "refSemantics.test.ts"), "utf-8");
    expect(src).toMatch(/01_Spec\.md#L\d+/);
    expect(src).toMatch(/toBe\(true\)/);
  });
});

// QFAI:SPEC-0012:TC-0012-0281
describe("Integration TC-0012-0281: isSpecDeclarationRef rejects non-line-ref forms", () => {
  it("refSemantics.test.ts covers negative forms: anchor, notes, appendix, discussion, screen contract, absolute path", async () => {
    const src = await readFile(testPath("core", "refSemantics.test.ts"), "utf-8");
    expect(src).toMatch(/route-home|anchor/i);
    expect(src).toMatch(/notes\.md/);
    expect(src).toMatch(/appendix\.md/);
    expect(src).toMatch(/discussion/);
    expect(src).toMatch(/40_screen_contracts\.md/);
    expect(src).toMatch(/\/abs\/specs/);
    expect(src).toMatch(/toBe\(false\)/);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0282..0284: rev11 test synchronization
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0282
describe("Integration TC-0012-0282: measurement.test.ts current DTO and negative cases", () => {
  it("measurement.test.ts contains runMeasurement, canonical screenContractRef reject case, and empty-category rejection", async () => {
    const src = await readFile(testPath("core", "harness", "measurement.test.ts"), "utf-8");
    expect(src).toMatch(/runMeasurement/);
    expect(src).toMatch(/screenContractRefs/);
    expect(src).toMatch(/rejects legacy screen contract anchor/);
    expect(src).toMatch(/rejects empty browserQaRefs/);
  });
});

// QFAI:SPEC-0012:TC-0012-0283
describe("Integration TC-0012-0283: panelScore.test.ts current shape and strict validation cases", () => {
  it("panelScore.test.ts covers axes + evidenceRefs validation on the current panel shape", async () => {
    const src = await readFile(testPath("core", "harness", "panelScore.test.ts"), "utf-8");
    expect(src).toMatch(/axes/);
    expect(src).toMatch(/evidenceRefs/);
    expect(src).toMatch(/rejects empty axes/);
    expect(src).toMatch(/rejects empty evidenceRefs/);
    expect(src).toMatch(/rejects absolute path evidenceRef/);
  });
});

// QFAI:SPEC-0012:TC-0012-0284
describe("Integration TC-0012-0284: specCoverage.test.ts and refSemantics.test.ts exist and cover rev11 boundaries", () => {
  it("specCoverage.test.ts exists and covers 01_Spec.md-only semantics", async () => {
    const src = await readFile(testPath("core", "specCoverage.test.ts"), "utf-8");
    expect(src).toMatch(/buildSpecCoverageSummary/);
    expect(src).toMatch(/01_Spec\.md/);
    expect(src).toMatch(/notes\.md/);
    expect(src).toMatch(/appendix\.md/);
  });

  it("refSemantics.test.ts exists and covers positive/negative declaredRef grammar boundaries", async () => {
    const src = await readFile(testPath("core", "refSemantics.test.ts"), "utf-8");
    expect(src).toMatch(/01_Spec\.md#L\d+/);
    expect(src).toMatch(/route-home|discussion|appendix\.md|notes\.md/i);
  });
});
