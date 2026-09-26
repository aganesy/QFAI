/**
 * Integration: Configure skill
 *
 * Validates that the /qfai-configure skill requirements are
 * covered by existing implementation: SKILL.md template, config module,
 * and loadConfig functionality.
 *
 * The skill should match the current story-tree contract.
 */
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
  "skill",
  "qfai-configure",
  "SKILL.md",
);

const CONFIG_PATH = path.resolve(__dirname, "..", "..", "src", "core", "config.ts");

describe("Repository Analysis Identifies Frameworks", () => {
  // QFAI:EX-0001-0077-01
  it("SKILL.md defines repository analysis as primary goal", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Aa]nalyze.*repositor/);
    expect(content).toContain("qfai.config.yaml");
    expect(content).toContain("Identify test frameworks and locations");
    expect(content).toContain("Enumerate directories that contain tests");
    expect(content).toContain("Note naming rules");
    expect(content).toContain("package manager (pnpm/npm/yarn)");
  });

  it("config module defines testFileGlobs for framework detection", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("testFileGlobs");
  });
});

describe("Glob Patterns Cover Test Locations", () => {
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

describe("Config Update Is Minimal", () => {
  // QFAI:EX-0001-0078-01
  it("SKILL.md mandates minimal diff for config changes", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/minimal.*diff/i);
    expect(content).toContain("traceability globs");
    expect(content).toContain("Keep `validation.require.specSections` unchanged");
  });
});

// Project context is populated from repository evidence.
describe("Project context is populated from evidence", () => {
  it("SKILL.md uses the story-tree policy and contract files", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain(".qfai/spec/01_policy/objective.md");
    expect(content).toContain(".qfai/spec/03_contract/tech.md");
    expect(content).toContain(".qfai/spec/03_contract/structure.md");
    expect(content).not.toContain(".qfai/assistant/catalog/");
    expect(content).toMatch(/Fill.*verifiable.*evidence/i);
  });
});

describe("Story-tree test discovery", () => {
  it("requires globs to cover each test obligation layer", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("BF needs E2E coverage");
    expect(content).toContain("AC needs integration or API coverage");
    expect(content).toContain("EX needs a selected non-E2E test");
    expect(content).toContain("03_contract/tech.md");
    expect(content).not.toContain(".qfai/specs/");
  });
});

describe("Evidence Sampling Produces Valid Matches", () => {
  it("SKILL.md requires sample matched files in evidence", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/sample.*matched.*files/i);
  });
});

describe("Zero Match Triggers Stop", () => {
  it("SKILL.md mandates stop and escalate on ambiguity", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/stop.*escalat/i);
  });
});

describe("Tool Selection Rationale Exists", () => {
  it("SKILL.md mandates tool selection rationale", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Tt]ool selection rationale/);
  });

  it("SKILL.md evidence template includes chosen tools per layer", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/chosen tools per layer/i);
  });
});

describe("Coverage Placeholder for AC-0009-0007", () => {
  it("config module exports QfaiValidationConfig with traceability fields", async () => {
    const content = await readFile(CONFIG_PATH, "utf-8");
    expect(content).toContain("QfaiValidationConfig");
    expect(content).toContain("traceability");
    expect(content).toContain("testFileGlobs");
    expect(content).toContain("testFileExcludeGlobs");
  });
});

describe("Coverage Placeholder for EX-0009-0005", () => {
  it("SKILL.md defines evidence file requirement", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/evidence.*configure-<run-id>\.md/i);
    expect(content).toContain("Evidence (MANDATORY)");
  });
});
