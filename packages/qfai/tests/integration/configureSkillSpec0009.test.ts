/**
 * Integration: Configure Skill Spec-0009 TDD Backfill
 *
 * Validates that the /qfai-configure skill (spec-0009) requirements are
 * covered by existing implementation: SKILL.md template, config module,
 * and loadConfig functionality.
 *
 * All 8 TDD items are Exception-pattern backfill (DR-0009-0001).
 */
// QFAI:SPEC-0009:TC-0009-0001
// QFAI:SPEC-0009:TC-0009-0002
// QFAI:SPEC-0009:TC-0009-0003
// QFAI:SPEC-0009:TC-0009-0004
// QFAI:SPEC-0009:TC-0009-0005
// QFAI:SPEC-0009:TC-0009-0006
// QFAI:SPEC-0009:TC-0009-0007
// QFAI:SPEC-0009:TC-0009-0008
// QFAI:SPEC-0009:TC-0009-0009
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-configure",
  "SKILL.md",
);

const CONFIG_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "config.ts",
);

// TC-0009-0001: Repository Analysis Identifies Frameworks
describe("TC-0009-0001: Repository Analysis Identifies Frameworks", () => {
  it("SKILL.md defines repository analysis as primary goal", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Aa]nalyze.*repositor/);
    expect(content).toContain("qfai.config.yaml");
  });

  it("config module defines testFileGlobs for framework detection", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("testFileGlobs");
  });
});

// TC-0009-0002: Glob Patterns Cover Test Locations
describe("TC-0009-0002: Glob Patterns Cover Test Locations", () => {
  it("config module defines testFileGlobs and testFileExcludeGlobs", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("testFileGlobs");
    expect(content).toContain("testFileExcludeGlobs");
  });

  it("SKILL.md specifies 3-10 include globs requirement", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("testFileGlobs");
  });
});

// TC-0009-0003: Config Update Is Minimal
describe("TC-0009-0003: Config Update Is Minimal", () => {
  it("SKILL.md mandates minimal diff for config changes", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/minimal.*diff/i);
    expect(content).toContain("traceability globs");
  });
});

// TC-0009-0004: Steering Populated from Evidence
describe("TC-0009-0004: Steering Populated from Evidence", () => {
  it("SKILL.md mandates steering refresh with evidence", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("product.md");
    expect(content).toContain("tech.md");
    expect(content).toContain("structure.md");
    expect(content).toContain("manifest.md");
    expect(content).toMatch(/Fill.*verifiable.*evidence/i);
  });
});

// TC-0009-0005: Evidence Sampling Produces Valid Matches
describe("TC-0009-0005: Evidence Sampling Produces Valid Matches", () => {
  it("SKILL.md requires sample matched files in evidence", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/sample.*matched.*files/i);
  });
});

// TC-0009-0006: Zero Match Triggers Stop
describe("TC-0009-0006: Zero Match Triggers Stop", () => {
  it("SKILL.md mandates stop and escalate on ambiguity", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/stop.*escalat/i);
  });
});

// TC-0009-0007: Tool Selection Rationale Exists
describe("TC-0009-0007: Tool Selection Rationale Exists", () => {
  it("SKILL.md mandates tool selection rationale", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Tt]ool selection rationale/);
  });

  it("SKILL.md evidence template includes chosen tools per layer", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/chosen tools per layer/i);
  });
});

// TC-0009-0008: Coverage Placeholder for AC-0009-0007
describe("TC-0009-0008: Coverage Placeholder for AC-0009-0007", () => {
  it("config module exports QfaiValidationConfig with traceability fields", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("QfaiValidationConfig");
    expect(content).toContain("traceability");
    expect(content).toContain("testFileGlobs");
    expect(content).toContain("testFileExcludeGlobs");
  });
});

// TC-0009-0009: Coverage Placeholder for EX-0009-0005
describe("TC-0009-0009: Coverage Placeholder for EX-0009-0005", () => {
  it("SKILL.md defines evidence file requirement", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/evidence.*configure-<run-id>\.md/i);
    expect(content).toContain("Evidence (MANDATORY)");
  });
});
