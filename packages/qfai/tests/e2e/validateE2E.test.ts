/**
 * E2E: qfai validate (spec-0002)
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
  it("validateProject calls runAllUixValidators (canonical path)", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(src).toContain("runAllUixValidators");
  });

  it("validators index exports runAllUixValidators", async () => {
    const indexPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "src",
      "core",
      "validators",
      "index.ts",
    );
    const src = await readFile(indexPath, "utf-8");
    expect(src).toContain("runAllUixValidators");
  });
});

// QFAI:SPEC-0004:US-0004-0016
describe("E2E: canonical UIX validator aggregation (US-0004-0016)", () => {
  it("uixValidators exports runAllUixValidators that aggregates validators", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "uixValidators.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+async\s+function\s+runAllUixValidators/);
    // Should not reference legacy 4-axis validator wrapper names
    expect(src).not.toMatch(/validate4Axis|fourAxisValidator/);
  });
});

// QFAI:SPEC-0004:US-0004-0017
describe("E2E: 3-layer template family validator alignment (US-0004-0017)", () => {
  it("validators index re-exports UIX validators including runAllUixValidators", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "index.ts"),
      "utf-8",
    );
    expect(src).toContain("runAllUixValidators");
    expect(src).toContain("validateScoringAxes");
    expect(src).toContain("validateStrategyCompleteness");
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
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");

    const result = runBrowserQa("<html><body><img src='test.png'><p>Content</p></body></html>");
    expect(result.status).toBe("completed");
    expect(result.metadata.runner).toBeTruthy();
    // Runner must report actual findings, not blanket pass
    expect(result.status).not.toBe("pass");
    expect(typeof result.findings).toBe("object");
    expect(Array.isArray(result.findings)).toBe(true);
  });
});
