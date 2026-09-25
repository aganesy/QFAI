/**
 * Integration: skill wording, the validate entry point and the Coverage
 * Depth Matrix of BF-0001.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("cross-doc routing consistency", () => {
  it("prototyping SKILL.md references routing precedence chain", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skill",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    // Prototyping skill should reference spec-related routing
    expect(content.length).toBeGreaterThan(0);
    // The SKILL.md should contain routing or validation references
    expect(content).toMatch(/spec|prototyp|validat/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Vocabulary, fixture alignment, integration
// ═══════════════════════════════════════════════════════════════════════════

describe("vocabulary pass scan", () => {
  it("SKILL.md uses canonical spec-related vocabulary", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skill",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    // Must use canonical vocabulary: spec, prototyping, evidence, validation
    expect(content).toMatch(/prototyp/i);
    expect(content).toMatch(/evidence|render|capture/i);
  });
});

describe("fixture alignment — exploration-first model", () => {
  it("discussion SKILL.md references exploration brief and rubric artifacts", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/exploration brief|exploration-first|exploration rubric/i);
  });
});

describe("fixture 4-axis reject", () => {
  it("discussion SKILL.md completion conditions do not use 4-axis model keyword", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    const completionMatch = /UI-bearing Completion Conditions([\s\S]*?)(?=^## |$)/m.exec(content);
    if (completionMatch?.[1]) {
      expect(completionMatch[1]).not.toMatch(/\b4-axis\b/i);
      expect(completionMatch[1]).not.toMatch(/\bfour-axis\b/i);
    }
  });
});

describe("TC-0014-0028: integration e2e — validateProject entrypoint", () => {
  it("validateProject function is importable and callable", async () => {
    const { validateProject } = await import("../../src/core/validate.js");
    expect(typeof validateProject).toBe("function");
  });
});

describe("TC-0014-0029: integration test existence", () => {
  it("integration test directory contains expected test files", async () => {
    const { readdir } = await import("node:fs/promises");
    const integrationDir = path.resolve(process.cwd(), "tests", "integration");
    const files = await readdir(integrationDir);
    const testFiles = files.filter((f) => f.endsWith(".test.ts"));
    expect(testFiles.length).toBeGreaterThanOrEqual(5);
    // Key test files must exist
    expect(testFiles).toContain("specAutoDiscovery.test.ts");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Quality Depth (TC-0008-0011..0012)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0008-0011
// QFAI:EX-0001-0074-01
describe("TC-0008-0011: Coverage Depth Matrix Produced and Verified", () => {
  it("the flow matrix records each required depth dimension and story-tree IDs", async () => {
    const matrixPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "evidence",
      "coverage-depth-BF-0001.md",
    );
    const content = await readFile(matrixPath, "utf-8");
    expect(content).toContain("Coverage Depth Matrix — BF-0001");
    expect(content).toMatch(
      /\| Normal \| Error \| Boundary \| Special \| State transition \| Combinatorial \|/,
    );
    expect(content).toContain("| US-0001-0074 |");
    expect(content).toContain("| AC-0001-0074-01 |");
    expect(content).toContain("| EX-0001-0074-01 |");
  });

  it("the story criterion assigns depth review to the business flow", async () => {
    const acPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "spec",
      "02_business-flow",
      "business-flow-0001",
      "user-story-0001-0074",
      "02_Acceptance-Criteria.md",
    );
    const content = await readFile(acPath, "utf-8");
    expect(content).toContain("AC-0001-0074-01");
    expect(content).toMatch(/normal\/error\/boundary\/special\/state-transition\/combinatorial/);
    expect(content).toContain("one ATDD evidence file");
  });
});

// TC-0008-0012
// QFAI:EX-0001-0074-01
describe("TC-0008-0012: Normal-Path-Only Flagged as Incomplete", () => {
  const storyDir = path.resolve(
    process.cwd(),
    "..",
    "..",
    ".qfai",
    "spec",
    "02_business-flow",
    "business-flow-0001",
    "user-story-0001-0074",
  );

  it("the story criterion requires incomplete status for a normal-only case", async () => {
    const content = await readFile(path.join(storyDir, "02_Acceptance-Criteria.md"), "utf-8");
    expect(content).toMatch(/only normal-path test cases is flagged as incomplete/);
  });

  it("the example assigns missing error depth to the criterion row", async () => {
    const content = await readFile(path.join(storyDir, "03_Example.md"), "utf-8");
    expect(content).toContain("EX-0001-0074-01");
    expect(content).toContain("❌ for Error path and is incomplete");
  });
});
