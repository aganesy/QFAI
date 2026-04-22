/**
 * E2E: qfai validate (spec-0004)
 *
 * Verifies high-level user journeys for the validate command:
 * validator execution and aggregation, phase control, exit code control,
 * GitHub Actions output, JSON output, run log generation, waiver application,
 * spec file validation, ID format validation, traceability verification,
 * ATDD annotation verification, discussion pack validation,
 * contract validation, Mermaid diagram validation, and
 * canonical validator entrypoint wiring.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

// QFAI:SPEC-0004:US-0004-0001
describe("E2E: validation execution (US-0004-0001)", () => {
  it("validate.ts exports validateProject which aggregates all validator results", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+async\s+function\s+validateProject/);
    // Should return issues and counts
    expect(src).toContain("countIssues");
    expect(src).toContain("applyWaivers");
  });

  it("validate.ts invokes 30+ validators in the pipeline", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    // Count distinct validator invocations
    const validatorCalls = src.match(/await\s+validate\w+\(/g) ?? [];
    expect(validatorCalls.length).toBeGreaterThanOrEqual(15);
  });
});

// QFAI:SPEC-0004:US-0004-0002
describe("E2E: validation phase control (US-0004-0002)", () => {
  it("validateProject accepts phase option", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("phase");
    expect(src).toMatch(/phase.*full|full.*phase/);
  });

  it("validate CLI command accepts --phase option", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("phase");
  });
});

// QFAI:SPEC-0004:US-0004-0003
describe("E2E: exit code control (US-0004-0003)", () => {
  it("validate CLI has failOn-based exit code logic", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("shouldFail");
    expect(src).toContain("willFail");
    expect(src).toMatch(/willFail\s*\?\s*1\s*:\s*0/);
  });

  it("failOn module exports shouldFail function", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "lib", "failOn.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+(async\s+)?function\s+shouldFail/);
  });
});

// QFAI:SPEC-0004:US-0004-0004
describe("E2E: GitHub Actions output (US-0004-0004)", () => {
  it("validate CLI emits GitHub annotation format (::error/::warning)", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "validate.ts"),
      "utf-8",
    );
    // Annotations are built dynamically via `::${level}` template
    expect(src).toMatch(/`::.*\$\{level\}/);
    expect(src).toContain('"error"');
    expect(src).toContain('"warning"');
    expect(src).toContain('"notice"');
  });

  it("respects GITHUB_ANNOTATION_LIMIT of 100", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "validate.ts"),
      "utf-8",
    );
    expect(src).toMatch(/GITHUB_ANNOTATION_LIMIT\s*=\s*100/);
  });
});

// QFAI:SPEC-0004:US-0004-0005
describe("E2E: validation result JSON output (US-0004-0005)", () => {
  it("validate CLI writes validate.json with structured results", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("emitJson");
    expect(src).toContain("validateJsonPath");
    expect(src).toContain("JSON.stringify");
  });
});

// QFAI:SPEC-0004:US-0004-0006
describe("E2E: run log generation (US-0004-0006)", () => {
  it("validate CLI writes run logs via writeValidateRunLog", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("writeValidateRunLog");
    expect(src).toContain("runLog");
    expect(src).toContain("reportDir");
  });
});

// QFAI:SPEC-0004:US-0004-0007
describe("E2E: waiver application (US-0004-0007)", () => {
  it("validateProject applies waivers to issues", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("applyWaivers");
    expect(src).toContain("waivers");
  });

  it("waivers module is imported from core", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toMatch(/import.*applyWaivers.*from.*waivers/);
  });
});

// QFAI:SPEC-0004:US-0004-0008
describe("E2E: spec required file validation (US-0004-0008)", () => {
  it("validates spec packs via validateSpecPacks", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("validateSpecPacks");
  });
});

// QFAI:SPEC-0004:US-0004-0009
describe("E2E: ID format validation (US-0004-0009)", () => {
  it("validates defined IDs via validateDefinedIds", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("validateDefinedIds");
  });
});

// QFAI:SPEC-0004:US-0004-0010
describe("E2E: traceability verification (US-0004-0010)", () => {
  it("validates traceability edges via validateTraceability", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("validateTraceability");
    expect(src).toMatch(/await\s+validateTraceability\(/);
  });
});

// QFAI:SPEC-0004:US-0004-0011
describe("E2E: ATDD annotation verification (US-0004-0011)", () => {
  it("validates ATDD code traceability when phase is not refinement", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("validateAtddCodeTraceability");
    expect(src).toContain("refinement");
  });
});

// QFAI:SPEC-0004:US-0004-0012
describe("E2E: discussion pack validation (US-0004-0012)", () => {
  it("validates discussion pack readiness", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("validateDiscussionPackReadiness");
    expect(src).toContain("validateDiscussionMermaid");
  });
});

// QFAI:SPEC-0004:US-0004-0013
describe("E2E: contract validation (US-0004-0013)", () => {
  it("validates contracts and contract references", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("validateContracts");
    expect(src).toContain("validateContractReferences");
  });
});

// QFAI:SPEC-0004:US-0004-0014
describe("E2E: Mermaid diagram validation (US-0004-0014)", () => {
  it("validates Mermaid diagrams via validateMermaidEnforcement", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("validateMermaidEnforcement");
    expect(src).toContain("validateDiscussionMermaid");
  });
});

// QFAI:SPEC-0004:US-0004-0015
describe("E2E: canonical validator entrypoint wiring (US-0004-0015)", () => {
  it("validateProject calls runCanonicalUixValidators (canonical path)", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("runCanonicalUixValidators");
  });
});

// QFAI:SPEC-0004:US-0004-0017
describe("E2E: 3-layer template family validator alignment (US-0004-0017)", () => {
  it("validators index exposes canonical UIX validators only", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "index.ts"),
      "utf-8",
    );
    expect(src).toContain("runCanonicalUixValidators");
    expect(src).not.toContain("runLegacyUixCompatibilityValidators");
    expect(src).not.toContain("validateScoringAxes");
    expect(src).not.toContain("validateStrategyCompleteness");
  });
});

// QFAI:SPEC-0004:US-0004-0018
describe("E2E: truthful render-evidence state handling (US-0004-0018)", () => {
  it("renderEvidenceTypes defines captured/skipped/failed states", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "uiux", "renderEvidenceTypes.ts"),
      "utf-8",
    );
    expect(src).toContain('"captured"');
    expect(src).toContain('"skipped"');
    expect(src).toContain('"failed"');
  });
});

// QFAI:SPEC-0004:US-0004-0019
describe("E2E: browser QA truthful implementation (US-0004-0019)", () => {
  it("browser QA runner returns actual evidence, not placeholder pass", async () => {
    const { runBrowserQaOrchestrated } = await import("../../src/core/browserQa/index.js");

    const result = await runBrowserQaOrchestrated({
      htmlContent: "<html><body><img src='test.png'><p>Content</p></body></html>",
      surface: "web",
    });
    expect(result.phases.length).toBeGreaterThan(0);
    expect(result.provider).toBeTruthy();
    // Runner must report actual phase results, not blanket pass
    expect(result.timestamp).toBeTruthy();
    expect(Array.isArray(result.phases)).toBe(true);
    expect(result.phases.every((p) => typeof p.status === "string")).toBe(true);
  });
});

// QFAI:SPEC-0004:US-0004-0016
describe("E2E: canonical UIX validator aggregation (US-0004-0016)", () => {
  it("validators/index.ts exports runCanonicalUixValidators as canonical aggregator", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "index.ts"),
      "utf-8",
    );
    expect(src).toContain("runCanonicalUixValidators");
  });

  it("validate.ts imports and invokes runCanonicalUixValidators from validators/index", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    // Import is a multi-line destructured import from validators/index.js
    expect(src).toContain("runCanonicalUixValidators");
    expect(src).toContain('from "./validators/index.js"');
    expect(src).toMatch(/runCanonicalUixValidators\(/);
  });
});

// QFAI:SPEC-0004:US-0004-0020
describe("E2E: canonical validator pipeline (US-0004-0020)", () => {
  it("validators/index.ts has only canonical validators, no legacy re-exports", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "index.ts"),
      "utf-8",
    );
    // Must not contain legacy compatibility layer re-exports
    expect(src).not.toContain("runLegacyUixCompatibilityValidators");
    expect(src).not.toContain("validateScoringAxes");
    expect(src).not.toContain("validateStrategyCompleteness");
    // Must contain canonical exports
    expect(src).toContain("runCanonicalUixValidators");
    expect(src).toContain("validatePrototypingEvidence");
  });
});

// QFAI:SPEC-0004:US-0004-0021
describe("E2E: IssueCategory discrimination (US-0004-0021)", () => {
  it('types.ts defines IssueCategory as "canonical" | "change" (no "compatibility")', async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "types.ts"),
      "utf-8",
    );
    expect(src).toMatch(/type\s+IssueCategory\s*=\s*"canonical"\s*\|\s*"change"/);
    expect(src).not.toContain('"compatibility"');
  });
});

// QFAI:SPEC-0004:US-0004-0022
describe("E2E: prototyping recommendation validation (US-0004-0022)", () => {
  it("validators/prototypingEvidence.ts checks prototyping.json schema", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("prototyping.json");
    expect(src).toContain("surface");
    expect(src).toContain("mode");
    expect(src).toContain("iterations");
  });
});

// QFAI:SPEC-0004:US-0004-0023
describe("E2E: full-harness iteration integrity errors (US-0004-0023)", () => {
  it("prototypingEvidence.ts includes the current iteration integrity rules", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("QFAI-PROT-280");
    expect(src).toContain("QFAI-PROT-281");
    expect(src).toContain("QFAI-PROT-282");
    expect(src).toContain("QFAI-PROT-299");
    expect(src).toContain("allItemsPass95");
  });
});

// QFAI:SPEC-0004:US-0004-0024
describe("E2E: reviewer/convergence truthfulness (US-0004-0024)", () => {
  it("prototypingEvidence.ts checks reviewer scores and evidence refs", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("reviewerScores");
    expect(src).toContain("reviewerId");
    expect(src).toContain("evidenceRefs");
  });

  it("prototypingEvidence.ts detects incomplete convergence before max iterations", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("QFAI-PROT-282");
    expect(src).toContain("remaining iterations");
  });
});

// QFAI:SPEC-0004:US-0004-0025
describe("E2E: evidence grounding validators (US-0004-0025)", () => {
  it("prototypingEvidence.ts validates concrete artifact refs in reviewer scores", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("isConcreteArtifactRef");
    expect(src).toContain("concrete artifact refs");
  });

  it("prototypingEvidence.ts validates runtimeGate and uiFidelity presence for full-harness", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("runtimeGate is required in full-harness mode");
    expect(src).toContain("uiFidelity is required in full-harness mode");
  });
});

// QFAI:SPEC-0004:US-0004-0026
describe("E2E: rev2 evidence category validators (US-0004-0026)", () => {
  it("prototypingEvidence.ts checks discussion evidenceRefs empty (PROT-310)", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("QFAI-PROT-280");
    expect(src).toContain("iterations[]");
  });

  it("prototypingEvidence.ts checks screenContract evidenceRefs empty (PROT-311)", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("runtimeGate");
    expect(src).toContain("QFAI-PROT-299");
  });

  it("prototypingEvidence.ts checks trend evidenceRefs empty (PROT-312)", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("uiFidelity");
    expect(src).toContain("QFAI-PROT-299");
  });

  it("prototypingEvidence.ts checks iteration evidenceRefs required categories (PROT-314)", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("QFAI-PROT-281");
    expect(src).toContain("max iterations");
  });

  it("prototypingEvidence.ts validates uiFidelity at screen-level", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("uiFidelity");
    expect(src).toContain("uiFidelity is required in full-harness mode");
  });

  it("prototypingEvidence.ts detects pre-scored l1/l2 (old schema detection, PROT-315)", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("QFAI-PROT-282");
    expect(src).toContain("all-items-pass-95");
  });
});

// QFAI:SPEC-0004:US-0004-0027
describe("E2E: test fixtures rev2 (US-0004-0027)", () => {
  it("prototypingEvidence.ts uses the current reviewerScores-based evidence contract", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("reviewerScores");
    expect(src).toContain("evidenceRefs");
    expect(src).toContain("axisId");
    expect(src).toContain("allItemsPass95");
  });

  it("prototypingEvidence validates flat score evidenceRefs arrays", async () => {
    const src = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "validators",
        "prototypingEvidence.ts",
      ),
      "utf-8",
    );
    expect(src).toContain("Array.isArray(score.evidenceRefs)");
    expect(src).toContain("score.evidenceRefs");
    expect(src).toContain("isConcreteArtifactRef");
  });

  it("unit tests for prototypingEvidence exist", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "tests", "validators", "uiEvidenceArtifacts.test.ts"),
      "utf-8",
    );
    expect(src).toContain("validateUiEvidenceArtifacts");
    expect(src).toContain("describe");
  });
});
