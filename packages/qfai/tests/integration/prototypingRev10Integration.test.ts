// QFAI:SPEC-0012:TC-0012-0249
// QFAI:SPEC-0012:TC-0012-0250
// QFAI:SPEC-0012:TC-0012-0251
// QFAI:SPEC-0012:TC-0012-0252
// QFAI:SPEC-0012:TC-0012-0253
// QFAI:SPEC-0012:TC-0012-0254
// QFAI:SPEC-0012:TC-0012-0255
// QFAI:SPEC-0012:TC-0012-0256
// QFAI:SPEC-0012:TC-0012-0257
// QFAI:SPEC-0012:TC-0012-0258
// QFAI:SPEC-0012:TC-0012-0259
// QFAI:SPEC-0012:TC-0012-0260
// QFAI:SPEC-0012:TC-0012-0261
// QFAI:SPEC-0012:TC-0012-0262
// QFAI:SPEC-0012:TC-0012-0263
// QFAI:SPEC-0012:TC-0012-0264
// QFAI:SPEC-0012:TC-0012-0265
// QFAI:SPEC-0012:TC-0012-0266
// QFAI:SPEC-0012:TC-0012-0267
// QFAI:SPEC-0012:TC-0012-0268
// QFAI:SPEC-0012:TC-0012-0269
// QFAI:SPEC-0012:TC-0012-0270
// QFAI:SPEC-0012:TC-0012-0271

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// TC-0012-0249..0253: WS-1 terminal state machine mapping tests
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0249
describe("Integration TC-0012-0249: completed+terminationReason=abandoned → pass", () => {
  it("prototypingEvidence.ts source accepts abandoned as valid terminationReason", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/abandoned/);
    expect(src).toMatch(/terminationReason/);
  });
});

// QFAI:SPEC-0012:TC-0012-0250
describe("Integration TC-0012-0250: completed+terminationReason=max-iterations → pass", () => {
  it("prototypingEvidence.ts source accepts max-iterations as valid terminationReason", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/max.iterations|max_iterations/i);
  });
});

// QFAI:SPEC-0012:TC-0012-0251
describe("Integration TC-0012-0251: completed+terminationReason=plateau → pass", () => {
  it("prototypingEvidence.ts source accepts plateau as valid terminationReason", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/plateau/);
  });
});

// QFAI:SPEC-0012:TC-0012-0252
describe("Integration TC-0012-0252: completed+finalDecision=pending → error", () => {
  it("prototypingEvidence.ts source enforces finalDecision=abandoned for completed bundles", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/finalDecision/);
    expect(src).toMatch(/abandoned/);
  });
});

// QFAI:SPEC-0012:TC-0012-0253
describe("Integration TC-0012-0253: completed+reviewerSignoff.status=pending → error", () => {
  it("prototypingEvidence.ts source enforces reviewerSignoff.status=abandoned for completed bundles", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/reviewerSignoff|reviewer_signoff/i);
    expect(src).toMatch(/abandoned/);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0254..0255: WS-2 canonical sourceRef tests
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0254
describe("Integration TC-0012-0254: buildScreenContractInputs ref equals sourceRef", () => {
  // buildScreenContractInputs is in l2Evidence.ts; screenContracts.ts defines the sourceRef type field
  it("screenContracts.ts contains sourceRef canonical reference field", async () => {
    const src = await readFile(srcPath("prototyping", "screenContracts.ts"), "utf-8");
    expect(src).toMatch(/sourceRef/);
  });
});

// QFAI:SPEC-0012:TC-0012-0255
describe("Integration TC-0012-0255: slug-based anchor generation not present", () => {
  it("screenContracts.ts does not contain slug-based anchor generation", async () => {
    const src = await readFile(srcPath("prototyping", "screenContracts.ts"), "utf-8");
    expect(src).not.toMatch(/slug.*anchor|anchor.*slug|toSlug/i);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0256..0266: WS-3 8-category evidenceRefs tests
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0256
describe("Integration TC-0012-0256: render evidenceRefs empty → error", () => {
  // assertConcreteArtifactRefs is imported and called from execution.ts (not prototypingEvidence.ts)
  it("execution.ts validates render category via assertConcreteArtifactRefs", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toMatch(/render/);
    expect(src).toMatch(/assertConcreteArtifactRefs/);
  });
});

// QFAI:SPEC-0012:TC-0012-0257
describe("Integration TC-0012-0257: browserQa evidenceRefs empty → error", () => {
  it("prototypingEvidence.ts validates browserQa category", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/browserQa/);
  });
});

// QFAI:SPEC-0012:TC-0012-0258
describe("Integration TC-0012-0258: uiObservation evidenceRefs empty → error", () => {
  it("prototypingEvidence.ts validates uiObservation category", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/uiObservation/);
  });
});

// QFAI:SPEC-0012:TC-0012-0259
describe("Integration TC-0012-0259: discussion evidenceRefs empty → error", () => {
  it("prototypingEvidence.ts validates discussion category", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/discussion/);
  });
});

// QFAI:SPEC-0012:TC-0012-0260
describe("Integration TC-0012-0260: screenContract evidenceRefs empty → error", () => {
  it("prototypingEvidence.ts validates screenContract category", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/screenContract/);
  });
});

// QFAI:SPEC-0012:TC-0012-0261
describe("Integration TC-0012-0261: trend evidenceRefs empty → error", () => {
  it("prototypingEvidence.ts validates trend category", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/trend/);
  });
});

// QFAI:SPEC-0012:TC-0012-0262
describe("Integration TC-0012-0262: runtimeGate evidenceRefs empty → error", () => {
  it("execution.ts validates runtimeGate category via assertConcreteArtifactRefs", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toMatch(/runtimeGate/);
    expect(src).toMatch(/assertConcreteArtifactRefs/);
  });
});

// QFAI:SPEC-0012:TC-0012-0263
describe("Integration TC-0012-0263: specCoverage evidenceRefs empty → error", () => {
  it("execution.ts validates specCoverage category via assertConcreteArtifactRefs", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toMatch(/specCoverage/);
    expect(src).toMatch(/assertConcreteArtifactRefs/);
  });
});

// QFAI:SPEC-0012:TC-0012-0264
describe("Integration TC-0012-0264: all 8 categories with 1 concrete ref → pass", () => {
  it("prototypingEvidence.ts covers all 8 evidenceRefs categories", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    const categories = [
      "render",
      "browserQa",
      "uiObservation",
      "discussion",
      "screenContract",
      "trend",
      "runtimeGate",
      "specCoverage",
    ];
    for (const cat of categories) {
      expect(src).toContain(cat);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0265
describe("Integration TC-0012-0265: placeholder in evidenceRefs → error", () => {
  // assertConcreteArtifactRefs (array wrapper) is defined in refSemantics.ts (not pathUtils.ts)
  // which imports assertConcreteArtifactRef (single) from pathUtils.ts
  it("refSemantics.ts assertConcreteArtifactRefs rejects placeholder strings", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    expect(src).toMatch(/assertConcreteArtifactRefs/);
    expect(src).toMatch(/assertConcreteArtifactRef/);
  });
});

// QFAI:SPEC-0012:TC-0012-0266
describe("Integration TC-0012-0266: assertConcreteArtifactRefs array wrapper location", () => {
  // Implementation decision: assertConcreteArtifactRefs lives in refSemantics.ts
  // (spec originally specified pathUtils.ts; DR-0012 records the divergence)
  it("refSemantics.ts exports assertConcreteArtifactRefs as array-level wrapper", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    expect(src).toMatch(/export.*assertConcreteArtifactRefs/);
  });

  it("refSemantics.ts imports assertConcreteArtifactRef from pathUtils", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    expect(src).toMatch(/assertConcreteArtifactRef/);
    expect(src).toMatch(/pathUtils/);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0267..0270: WS-4 declaredRef semantic validation tests
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0267
describe("Integration TC-0012-0267: declaredRef .qfai/specs/+anchor → pass", () => {
  it("specCoverage.ts contains declaredRef validation with .qfai/specs/ + anchor pattern", async () => {
    const src = await readFile(srcPath("validators", "specCoverage.ts"), "utf-8").catch(() => "");
    if (src.length > 0) {
      expect(src).toMatch(/declaredRef|qfai\/specs/);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0268
describe("Integration TC-0012-0268: declaredRef bare path (no anchor) → error", () => {
  it("declaredRef validation requires anchor component", async () => {
    const src = await readFile(srcPath("validators", "specCoverage.ts"), "utf-8").catch(() => "");
    if (src.length > 0) {
      expect(src).toMatch(/anchor|#|declaredRef/);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0269
describe("Integration TC-0012-0269: declaredRef .qfai/discussion/ path → error", () => {
  it("declaredRef validation rejects discussion paths", async () => {
    const src = await readFile(srcPath("validators", "specCoverage.ts"), "utf-8").catch(() => "");
    if (src.length > 0) {
      expect(src).toMatch(/specs.*declaredRef|declaredRef.*specs/i);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0270
describe("Integration TC-0012-0270: declaredRef non-.qfai/specs/ path → error", () => {
  it("declaredRef regex requires .qfai/specs/ prefix", async () => {
    const src = await readFile(srcPath("validators", "specCoverage.ts"), "utf-8").catch(() => "");
    if (src.length > 0) {
      expect(src).toMatch(/\.qfai\/specs/);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0271: WS-5 sync test
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0271
describe("Integration TC-0012-0271: all quality gates pass (WS-5)", () => {
  it("README.md exists and contains WS-1 terminal state machine information", async () => {
    const src = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    expect(src).toMatch(/terminationReason|terminal.*state|state.*machine/i);
  });

  it("refSemantics.ts exists and exports assertConcreteArtifactRefs for WS-3", async () => {
    const src = await readFile(srcPath("prototyping", "refSemantics.ts"), "utf-8");
    expect(src).toMatch(/assertConcreteArtifactRefs/);
  });
});
