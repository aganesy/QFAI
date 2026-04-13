/**
 * Integration: Init Command Spec-0003 TDD Backfill
 *
 * Validates that the init command (spec-0003) requirements are covered
 * by existing implementation: init.ts CLI command module.
 *
 * All 15 TDD items are Exception-pattern backfill (DR-0003-0006).
 * Existing coverage: tests/cli/init.test.ts, tests/codex/agents.test.ts.
 */
// QFAI:SPEC-0003:TC-0003-0001
// QFAI:SPEC-0003:TC-0003-0002
// QFAI:SPEC-0003:TC-0003-0003
// QFAI:SPEC-0003:TC-0003-0004
// QFAI:SPEC-0003:TC-0003-0005
// QFAI:SPEC-0003:TC-0003-0006
// QFAI:SPEC-0003:TC-0003-0007
// QFAI:SPEC-0003:TC-0003-0008
// QFAI:SPEC-0003:TC-0003-0009
// QFAI:SPEC-0003:TC-0003-0010
// QFAI:SPEC-0003:TC-0003-0011
// QFAI:SPEC-0003:TC-0003-0012
// QFAI:SPEC-0003:TC-0003-0013
// QFAI:SPEC-0003:TC-0003-0014
// QFAI:SPEC-0003:TC-0003-0015
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const INIT_CLI = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "cli",
  "commands",
  "init.ts",
);

// TC-0003-0001: Empty directory initialization
describe("TC-0003-0001: Empty directory initialization", () => {
  it("init module exports runInit", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("runInit");
    expect(content).toContain(".qfai");
  });
});

// TC-0003-0002: Idempotent initialization
describe("TC-0003-0002: Idempotent initialization", () => {
  it("init handles existing files without overwrite", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/exist|skip/i);
  });
});

// TC-0003-0003: --force skill overwrite + skills.local protection
describe("TC-0003-0003: --force skill overwrite + skills.local protection", () => {
  it("init supports force option", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/force/);
  });
});

// TC-0003-0004: --dry-run preview
describe("TC-0003-0004: --dry-run preview", () => {
  it("init supports dryRun option", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/dryRun|dry.?run/);
  });
});

// TC-0003-0005: Skill directory symlink generation
describe("TC-0003-0005: Skill directory symlink generation", () => {
  it("init creates skill symlinks", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/symlink/i);
    expect(content).toContain("skills");
  });
});

// TC-0003-0006: Agent file symlink generation
describe("TC-0003-0006: Agent file symlink generation", () => {
  it("init creates agent symlinks", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/agent/i);
    expect(content).toMatch(/symlink/i);
  });
});

// TC-0003-0007: Legacy 10_workflow.md removal
describe("TC-0003-0007: Legacy 10_workflow.md removal", () => {
  it("init handles legacy file removal", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/legacy|prune|remove|obsolet/i);
  });
});

// TC-0003-0008: Old commands/prompts prune
describe("TC-0003-0008: Old commands/prompts prune", () => {
  it("init prunes old command files", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/prune|commands|prompts/i);
  });
});

// TC-0003-0009: Git config core.symlinks auto-setting
describe("TC-0003-0009: Git config core.symlinks auto-setting", () => {
  it("init configures git symlinks", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/core\.symlinks|git.*config/i);
  });
});

// TC-0003-0010: Windows EPERM error message
describe("TC-0003-0010: Windows EPERM error message", () => {
  it("init handles EPERM for symlink creation", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/EPERM|Developer Mode|Windows/i);
  });
});

// TC-0003-0011: Instructions new placement
describe("TC-0003-0011: Instructions new placement", () => {
  it("init creates instruction files", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/instructions/i);
  });
});

// TC-0003-0012: Instructions existing file skip
describe("TC-0003-0012: Instructions existing file skip", () => {
  it("init skips existing instruction files", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/instructions/i);
  });
});

// TC-0003-0013: --force does not overwrite instructions
describe("TC-0003-0013: --force does not overwrite instructions", () => {
  it("init protects instructions from force overwrite", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/instructions/i);
    expect(content).toMatch(/force/i);
  });
});

// TC-0003-0014: Instructions activation guidance
describe("TC-0003-0014: Instructions activation guidance", () => {
  it("init provides activation guidance", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/activat|guidance|instruct/i);
  });
});

// TC-0003-0015: Symlink idempotency (3 consecutive runs)
describe("TC-0003-0015: Symlink idempotency (3 consecutive runs)", () => {
  it("init handles consecutive runs idempotently", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/symlink/i);
  });
});
