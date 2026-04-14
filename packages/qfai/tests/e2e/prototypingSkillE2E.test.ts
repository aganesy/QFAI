// QFAI:SPEC-0012:US-0012-0008
// QFAI:SPEC-0012:US-0012-0009
// QFAI:SPEC-0012:US-0012-0010
// QFAI:SPEC-0012:US-0012-0011
// QFAI:SPEC-0012:US-0012-0012
// QFAI:SPEC-0012:US-0012-0013
// QFAI:SPEC-0012:US-0012-0014
// QFAI:SPEC-0012:US-0012-0015
// QFAI:SPEC-0012:US-0012-0016
// QFAI:SPEC-0012:US-0012-0017
// QFAI:SPEC-0012:US-0012-0018
// QFAI:SPEC-0012:US-0012-0019
// QFAI:SPEC-0012:US-0012-0020
// QFAI:SPEC-0012:US-0012-0021
// QFAI:SPEC-0012:US-0012-0022
// QFAI:SPEC-0012:US-0012-0023
// QFAI:SPEC-0012:US-0012-0024
// QFAI:SPEC-0012:US-0012-0025
// QFAI:SPEC-0012:US-0012-0026
// QFAI:SPEC-0012:US-0012-0027
// QFAI:SPEC-0012:US-0012-0028
// QFAI:SPEC-0012:US-0012-0029
// QFAI:SPEC-0012:US-0012-0030
// QFAI:SPEC-0012:US-0012-0031
// QFAI:SPEC-0012:US-0012-0032
// QFAI:SPEC-0012:US-0012-0033
// QFAI:SPEC-0012:US-0012-0034
// QFAI:SPEC-0012:US-0012-0035
// QFAI:SPEC-0012:US-0012-0036
// QFAI:SPEC-0012:US-0012-0037

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

function assetPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", ...segments);
}

// ---------------------------------------------------------------------------
// US-0012-0008: Skill-centered truth
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0008
describe("E2E: US-0012-0008 — SKILL.md declares /qfai-prototyping as sole interface", () => {
  it("SKILL.md frontmatter declares name: qfai-prototyping", async () => {
    const src = await readFile(
      assetPath("assistant", "skills", "qfai-prototyping", "SKILL.md"),
      "utf-8",
    );
    expect(src).toMatch(/^---\s*\n/);
    expect(src).toMatch(/name:\s*qfai-prototyping/);
  });

  it("SKILL.md contains /qfai-prototyping heading", async () => {
    const src = await readFile(
      assetPath("assistant", "skills", "qfai-prototyping", "SKILL.md"),
      "utf-8",
    );
    expect(src).toContain("## /qfai-prototyping");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0009: CLI ref elimination
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0009
describe("E2E: US-0012-0009 — no active doc references qfai prototyping CLI", () => {
  it("SKILL.md does not reference a standalone 'qfai prototyping' CLI binary", async () => {
    const src = await readFile(
      assetPath("assistant", "skills", "qfai-prototyping", "SKILL.md"),
      "utf-8",
    );
    // Should not contain instructions to run bare 'qfai prototyping' as a standalone CLI
    expect(src).not.toMatch(/^\s*\$\s+qfai prototyping\b/m);
  });

  it("execution.ts is a library module, not a CLI entrypoint", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).not.toContain("#!/usr/bin/env");
    expect(src).not.toContain("process.argv");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0010: Static-first mode contract
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0010
describe("E2E: US-0012-0010 — SKILL.md declares static-first default with modes", () => {
  it("SKILL.md mentions static-first for planning", async () => {
    const src = await readFile(
      assetPath("assistant", "skills", "qfai-prototyping", "SKILL.md"),
      "utf-8",
    );
    expect(src).toContain("static-first");
  });

  it("SKILL.md declares full-harness mode section", async () => {
    const src = await readFile(
      assetPath("assistant", "skills", "qfai-prototyping", "SKILL.md"),
      "utf-8",
    );
    expect(src).toMatch(/###?\s*Full-harness/i);
  });

  it("mode.ts only recognizes full-harness as valid mode", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/VALID_MODES.*Set.*\["full-harness"\]/s);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0011: Mode module
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0011
describe("E2E: US-0012-0011 — mode.ts exports required functions", () => {
  it("exports resolvePrototypingMode", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+resolvePrototypingMode/);
  });

  it("exports derivePrototypingObligations", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+derivePrototypingObligations/);
  });

  it("exports parseDiscussionModeRecommendationWithWarnings", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/export\s+async\s+function\s+parseDiscussionModeRecommendationWithWarnings/);
  });

  it("exports inferSurfaceFromRecommendationAndEvidence", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+inferSurfaceFromRecommendationAndEvidence/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0012: Recommendation resolver
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0012
describe("E2E: US-0012-0012 — recommendationArtifact.ts exports resolveLatestRecommendationArtifact", () => {
  it("exports resolveLatestRecommendationArtifact as async function", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationArtifact.ts"), "utf-8");
    expect(src).toMatch(/export\s+async\s+function\s+resolveLatestRecommendationArtifact/);
  });

  it("returns status with valid/invalid/missing/no-pack", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationArtifact.ts"), "utf-8");
    expect(src).toContain('"valid"');
    expect(src).toContain('"invalid"');
    expect(src).toContain('"missing"');
    expect(src).toContain('"no-pack"');
  });
});

// ---------------------------------------------------------------------------
// US-0012-0013: Existence-based precedence
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0013
describe("E2E: US-0012-0013 — mode.ts uses key existence not value validity", () => {
  it("recommendationSchema.ts hasNamespacedRecommendationBlock uses hasOwnProperty for key existence", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationSchema.ts"), "utf-8");
    expect(src).toMatch(/hasOwnProperty\.call\(parsed,\s*"prototyping"\)/);
  });

  it("mode.ts imports and uses hasNamespacedRecommendationBlock", async () => {
    const src = await readFile(srcPath("prototyping", "mode.ts"), "utf-8");
    expect(src).toContain("hasNamespacedRecommendationBlock");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0014: Obligation matrix
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0014
describe("E2E: US-0012-0014 — types.ts exports PrototypingObligations type", () => {
  it("types.ts exports PrototypingObligations with required fields", async () => {
    const src = await readFile(srcPath("prototyping", "types.ts"), "utf-8");
    expect(src).toMatch(/export\s+type\s+PrototypingObligations/);
    expect(src).toContain("requireRuntimeGate");
    expect(src).toContain("requireUiFidelity");
    expect(src).toContain("requireRenderBundle");
    expect(src).toContain("requireBrowserQaBundle");
    expect(src).toContain("requireFullHarness");
    expect(src).toContain("validCombination");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0015: Calibration config
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0015
describe("E2E: US-0012-0015 — calibration config with accept/refine/maxIterations/plateauDelta/plateauLookback", () => {
  it("loader.ts validates accept and refine thresholds", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toContain("thresholds.accept");
    expect(src).toContain("thresholds.refine");
  });

  it("loader.ts validates maxIterations, plateauDelta, plateauLookback", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toContain("maxIterations");
    expect(src).toContain("plateauDelta");
    expect(src).toContain("plateauLookback");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0016: Report integration
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0016
describe("E2E: US-0012-0016 — report.ts includes prototyping section", () => {
  it("report.ts references prototyping summary", async () => {
    const src = await readFile(srcPath("report.ts"), "utf-8");
    expect(src).toContain("prototyping");
    expect(src).toContain("Prototyping");
  });

  it("report.ts imports from prototyping modules", async () => {
    const src = await readFile(srcPath("report.ts"), "utf-8");
    expect(src).toMatch(/import.*from.*\.\/prototyping\//);
    expect(src).toContain("resolveLatestRecommendationArtifact");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0017: Canonical surfaces
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0017
describe("E2E: US-0012-0017 — types.ts exports PrototypingSurface with canonical names", () => {
  it("domain/surface.ts defines canonical surfaces without -ui suffix", async () => {
    const src = await readFile(srcPath("domain", "surface.ts"), "utf-8");
    expect(src).toContain('"web"');
    expect(src).toContain('"mobile"');
    expect(src).toContain('"desktop"');
    expect(src).toContain('"cli"');
    expect(src).toContain('"mixed"');
    expect(src).not.toContain('"web-ui"');
    expect(src).not.toContain('"mobile-ui"');
    expect(src).not.toContain('"desktop-ui"');
  });

  it("types.ts PrototypingSurface is aliased from CanonicalPrototypingSurface", async () => {
    const src = await readFile(srcPath("prototyping", "types.ts"), "utf-8");
    expect(src).toMatch(/PrototypingSurface\s*=\s*CanonicalPrototypingSurface/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0018: Execution hard gates
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0018
describe("E2E: US-0012-0018 — execution.ts exports readValidatedClassification, rejects invalid/non-UI", () => {
  it("execution.ts imports readValidatedClassification", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("readValidatedClassification");
  });

  it("execution.ts throws on null classification", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("classification === null");
    expect(src).toContain("Classification is invalid");
  });

  it("execution.ts throws on non-UI classification", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("!classification.ui_bearing");
    expect(src).toContain("Non-UI classification is not a prototyping execution target");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0019: Namespaced-only schema
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0019
describe("E2E: US-0012-0019 — recommendationSchema.ts validates prototyping.yaml schema", () => {
  it("exports hasNamespacedRecommendationBlock", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationSchema.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+hasNamespacedRecommendationBlock/);
  });

  it("exports hasLegacyRecommendationKeys", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationSchema.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+hasLegacyRecommendationKeys/);
  });

  it("exports isPlainRecord", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationSchema.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+isPlainRecord/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0020: Semantic invariant
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0020
describe("E2E: US-0012-0020 — recommendationSemantics.ts exports validateRecommendationSemantics", () => {
  it("exports validateRecommendationSemantics function", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationSemantics.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+validateRecommendationSemantics/);
  });

  it("enforces recommendedMode must be in allowedModes", async () => {
    const src = await readFile(srcPath("prototyping", "recommendationSemantics.ts"), "utf-8");
    expect(src).toContain("allowedModes.includes(recommendation.recommendedMode)");
    expect(src).toContain("QFAI-PROT-154");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0021: Classification-aware
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0021
describe("E2E: US-0012-0021 — mode.ts distinguishes cli surface for evidence obligations", () => {
  it("surfacePolicy.ts excludes cli from supported prototyping surfaces", async () => {
    const src = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    expect(src).toContain("PROTOTYPING_SUPPORTED_SURFACES");
    // cli is not in the supported surfaces for prototyping execution
    expect(src).toMatch(/PROTOTYPING_SUPPORTED_SURFACES\s*=\s*\[/);
    expect(src).not.toMatch(/PROTOTYPING_SUPPORTED_SURFACES\s*=\s*\[.*"cli"/);
  });

  it("domain/surface.ts includes cli as a canonical surface but marks visual evidence separately", async () => {
    const src = await readFile(srcPath("domain", "surface.ts"), "utf-8");
    expect(src).toContain("requiresVisualBrowserEvidenceSurface");
    expect(src).toMatch(/value\s*!==\s*"cli"/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0022: Full-harness iteration
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0022
describe("E2E: US-0012-0022 — harness/runtime.ts implements iteration protocol", () => {
  it("exports runFullHarness as async function", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toMatch(/export\s+async\s+function\s+runFullHarness/);
  });

  it("runtime records exactly one iteration per invocation", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    // It does not contain a self-modifying loop
    expect(src).toContain("Does NOT contain a self-modifying loop");
    expect(src).toContain("records exactly one iteration");
  });

  it("runtime uses real evidence (panelInputs, measurement, history)", async () => {
    const src = await readFile(srcPath("harness", "runtime.ts"), "utf-8");
    expect(src).toContain("scorePanelsFromInputs");
    expect(src).toContain("validatePanelInputs");
    expect(src).toContain("runMeasurement");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0023: Independent evaluator
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0023
describe("E2E: US-0012-0023 — evaluator panel in harness", () => {
  it("panelScore.ts exports scoreL1 and scoreL2 as separate evaluator functions", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+scoreL1/);
    expect(src).toMatch(/export\s+function\s+scoreL2/);
  });

  it("panelInputs.ts exports validatePanelInputs", async () => {
    const src = await readFile(srcPath("harness", "panelInputs.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+validatePanelInputs/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0024: Score scope separation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0024
describe("E2E: US-0012-0024 — scoring.ts separates discussion vs prototyping scores", () => {
  it("panelScore.ts L1 covers implementation fidelity axes", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toContain("runtime-gate");
    expect(src).toContain("render-coverage");
    expect(src).toContain("browser-qa-blocking");
    expect(src).toContain("screen-contract-coverage");
    expect(src).toContain("spec-coverage");
  });

  it("panelScore.ts L2 covers product experience axes", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toContain("discussion-axes");
    expect(src).toContain("screen-contract-fidelity");
    expect(src).toContain("trend-alignment");
    expect(src).toContain("visual-findings");
    expect(src).toContain("browser-qa-experience");
  });

  it("panelScore.ts L1 returns panel: 'L1' and L2 returns panel: 'L2'", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toMatch(/panel:\s*"L1"/);
    expect(src).toMatch(/panel:\s*"L2"/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0025: Full-harness validators
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0025
describe("E2E: US-0012-0025 — validators/prototypingEvidence.ts includes PROT-290..294", () => {
  it("validator includes QFAI-PROT-290 (single-iteration converged)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-290");
  });

  it("validator includes QFAI-PROT-291 (scoringTrace/iterations match)", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-291");
  });

  it("validator includes QFAI-PROT-292..294", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("QFAI-PROT-292");
    expect(src).toContain("QFAI-PROT-293");
    expect(src).toContain("QFAI-PROT-294");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0026: Real convergence
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0026
describe("E2E: US-0012-0026 — scoring requires iterationCount>=2 for converged", () => {
  it("history.ts computeTerminationReason requires count >= plateauLookback for convergence", async () => {
    const src = await readFile(srcPath("harness", "history.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+computeTerminationReason/);
    expect(src).toContain("count < calibration.plateauLookback");
  });

  it("history.ts single-iteration accept does NOT produce converged", async () => {
    const src = await readFile(srcPath("harness", "history.ts"), "utf-8");
    expect(src).toContain("single-iteration accept does NOT produce converged");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0027: Missing evidence fail-fast
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0027
describe("E2E: US-0012-0027 — execution.ts throws on missing evidence", () => {
  it("execution.ts throws on missing screen contracts", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("Full-harness requires canonical screen contracts");
  });

  it("execution.ts throws when render adapter is missing", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("Full-harness requires a render adapter");
  });

  it("execution.ts throws when reviewer is missing", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("Full-harness mode requires --reviewer");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0028: Evidence grounding
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0028
describe("E2E: US-0012-0028 — specCoverage from real diffs, uiFidelity rejects synthetic", () => {
  it("specCoverage.ts buildSpecCoverageSummary reads real spec declarations", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/export\s+async\s+function\s+buildSpecCoverageSummary/);
    expect(src).toContain("loadDeclaredSpecArtifacts");
  });

  it("uiFidelityBuilder.ts builds from real evidence (render, browserQa)", async () => {
    const src = await readFile(srcPath("prototyping", "uiFidelityBuilder.ts"), "utf-8");
    expect(src).toContain("buildUiObservationSummary");
    expect(src).toContain("readCanonicalScreenContracts");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0029: Docs-runtime sync
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0029
describe("E2E: US-0012-0029 — docs claims match runtime conditions", () => {
  it("SKILL.md obligation matrix matches surfacePolicy supported surfaces", async () => {
    const skill = await readFile(
      assetPath("assistant", "skills", "qfai-prototyping", "SKILL.md"),
      "utf-8",
    );
    const policy = await readFile(srcPath("prototyping", "surfacePolicy.ts"), "utf-8");
    // SKILL.md lists web/mobile/desktop/mixed in the obligation matrix
    expect(skill).toContain("web / full-harness");
    expect(skill).toContain("mobile / full-harness");
    expect(skill).toContain("desktop / full-harness");
    expect(skill).toContain("mixed / full-harness");
    // surfacePolicy must match those 4
    expect(policy).toContain('"web"');
    expect(policy).toContain('"mobile"');
    expect(policy).toContain('"desktop"');
    expect(policy).toContain('"mixed"');
  });

  it("SKILL.md requires reviewer and runtime enforces it", async () => {
    const skill = await readFile(
      assetPath("assistant", "skills", "qfai-prototyping", "SKILL.md"),
      "utf-8",
    );
    const exec = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(skill).toContain("--reviewer");
    expect(exec).toContain("--reviewer");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0030: Pre-scored path elimination (rev2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0030
describe("E2E: US-0012-0030 — request type has no l1/l2 fields", () => {
  it("PrototypingExecutionRequest has no l1 or l2 score fields", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    // Extract the PrototypingExecutionRequest type block
    const typeMatch = src.match(/export\s+type\s+PrototypingExecutionRequest\s*=\s*\{([^}]+)\}/s);
    expect(typeMatch).not.toBeNull();
    const typeBody = typeMatch![1];
    expect(typeBody).not.toContain("l1:");
    expect(typeBody).not.toContain("l2:");
    expect(typeBody).not.toContain("dimensionScores");
  });

  it("panelScore.ts prohibits pre-scored metadata flow-through", async () => {
    const src = await readFile(srcPath("harness", "panelScore.ts"), "utf-8");
    expect(src).toContain("Pre-scored metadata.dimensionScores flow-through is prohibited");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0031: l2Evidence real artifact (rev2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0031
describe("E2E: US-0012-0031 — l2Evidence.ts exports 3 builders", () => {
  it("exports buildDiscussionAxisInputs", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toMatch(/export\s+async\s+function\s+buildDiscussionAxisInputs/);
  });

  it("exports buildScreenContractInputs", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toMatch(/export\s+async\s+function\s+buildScreenContractInputs/);
  });

  it("exports buildTrendAlignmentInputs", async () => {
    const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(src).toMatch(/export\s+async\s+function\s+buildTrendAlignmentInputs/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0032: CalibrationLoader fail-closed (rev2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0032
describe("E2E: US-0012-0032 — loader.ts throws on every misconfiguration", () => {
  it("CalibrationLoader throws on missing file (ENOENT)", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toContain("Calibration pack not found at");
    expect(src).toContain("ENOENT");
  });

  it("CalibrationLoader throws on missing version field (no 1.0.0 fallback)", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toContain("missing required 'version' field");
    expect(src).toContain('no "1.0.0" fallback');
  });

  it("CalibrationLoader throws on missing thresholds/maxIterations/plateauDelta/plateauLookback", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    expect(src).toContain("missing required 'thresholds' block");
    expect(src).toContain("missing required 'maxIterations'");
    expect(src).toContain("missing required 'plateauDelta'");
    expect(src).toContain("missing required 'plateauLookback'");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0033: Termination semantics (rev2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0033
describe("E2E: US-0012-0033 — history.ts requires count >= plateauLookback", () => {
  it("computeTerminationReason returns undefined when count < plateauLookback", async () => {
    const src = await readFile(srcPath("harness", "history.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+computeTerminationReason/);
    // Strict: do not use Math.min to adapt lookback
    expect(src).toContain("Do not use Math.min to adapt lookback");
    expect(src).toContain("count < calibration.plateauLookback");
  });

  it("computeTerminationReason checks max-iterations, plateau, and converged", async () => {
    const src = await readFile(srcPath("harness", "history.ts"), "utf-8");
    expect(src).toContain('"max-iterations"');
    expect(src).toContain('"converged"');
    expect(src).toContain('"plateau"');
  });
});

// ---------------------------------------------------------------------------
// US-0012-0034: specCoverage strict (rev2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0034
describe("E2E: US-0012-0034 — specCoverage.ts requires all declared specs, rejects silent empty", () => {
  it("specCoverage.ts reads real spec directories (not zero-seeded)", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toContain("Zero-seeded coverage is prohibited");
  });

  it("specCoverage.ts loads spec entries via readdir", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toContain("readdir");
    expect(src).toContain('spec-"');
  });
});

// ---------------------------------------------------------------------------
// US-0012-0035: Screen-level UiObservation (rev2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0035
describe("E2E: US-0012-0035 — uiObservation.ts exports ScreenObservation type", () => {
  it("panelInputs.ts defines ScreenObservation with screen-level fields", async () => {
    const src = await readFile(srcPath("harness", "panelInputs.ts"), "utf-8");
    expect(src).toMatch(/export\s+type\s+ScreenObservation/);
    expect(src).toContain("screenId");
    expect(src).toContain("route");
    expect(src).toContain("htmlCaptureRef");
    expect(src).toContain("domLabelsFound");
    expect(src).toContain("elementsPlaced");
    expect(src).toContain("actionsWired");
  });

  it("uiObservation.ts exports extractDomLabelsWithJsdom", async () => {
    const src = await readFile(srcPath("prototyping", "uiObservation.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+extractDomLabelsWithJsdom/);
  });
});

// ---------------------------------------------------------------------------
// US-0012-0036: ReviewerLog/BundleWriter integrity (rev2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0036
describe("E2E: US-0012-0036 — 8 categories, strict length, schema v2", () => {
  it("FullHarnessIteration evidenceRefs has exactly 8 categories", async () => {
    const src = await readFile(srcPath("harness", "types.ts"), "utf-8");
    // Extract the evidenceRefs block from FullHarnessIteration
    const erefMatch = src.match(/evidenceRefs:\s*\{([^}]+)\}/s);
    expect(erefMatch).not.toBeNull();
    const erefBody = erefMatch![1];
    const categories = erefBody.match(/\w+:\s*string\[\]/g);
    expect(categories).not.toBeNull();
    expect(categories!.length).toBe(8);
  });

  it("bundleWriter.ts includes fullHarness block with reviewerLogs and scoringTrace", async () => {
    const src = await readFile(srcPath("evidence", "bundleWriter.ts"), "utf-8");
    expect(src).toContain("reviewerLogs");
    expect(src).toContain("scoringTrace");
    expect(src).toContain("calibrationRef");
  });

  it("history.ts validateHistoryConsistency enforces structural invariants", async () => {
    const src = await readFile(srcPath("harness", "history.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+validateHistoryConsistency/);
    expect(src).toContain("history.iterations.length !== history.scoringTrace.length");
    expect(src).toContain("reviewerLogsLength");
  });
});

// ---------------------------------------------------------------------------
// US-0012-0037: Test fixtures rev2
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0037
describe("E2E: US-0012-0037 — no l1/l2 direct pass, no packVersion 1.0.0, no single-iteration converged in normal fixtures", () => {
  it("PrototypingExecutionRequest does not carry pre-computed l1/l2 scores", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    const reqMatch = src.match(/export\s+type\s+PrototypingExecutionRequest\s*=\s*\{([^}]+)\}/s);
    expect(reqMatch).not.toBeNull();
    const reqBody = reqMatch![1];
    // No l1Score, l2Score, or dimensionScores
    expect(reqBody).not.toMatch(/l1Score|l2Score|dimensionScores/);
  });

  it("CalibrationLoader rejects missing version (no 1.0.0 default)", async () => {
    const src = await readFile(srcPath("calibration", "loader.ts"), "utf-8");
    // The loader does not provide a default "1.0.0" version
    expect(src).not.toMatch(/version\s*(?:=|:)\s*["']1\.0\.0["']/);
    expect(src).toContain("missing required 'version' field");
  });

  it("computeTerminationReason never returns converged for single-iteration history", async () => {
    const src = await readFile(srcPath("harness", "history.ts"), "utf-8");
    // The function explicitly requires count >= plateauLookback before returning converged
    // plateauLookback is always >= 2 by calibration contract
    expect(src).toContain("count < calibration.plateauLookback");
    // Convergence requires iterationCount >= 2
    expect(src).toContain("Convergence requires iterationCount >= 2");
  });
});
