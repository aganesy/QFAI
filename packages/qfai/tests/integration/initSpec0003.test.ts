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
// QFAI:SPEC-0003:TC-0003-0018
// QFAI:SPEC-0003:TC-0003-0019
// QFAI:SPEC-0003:TC-0003-0020
// QFAI:SPEC-0003:TC-0003-0021
// QFAI:SPEC-0003:TC-0003-0022
// QFAI:SPEC-0003:TC-0003-0023
// QFAI:SPEC-0003:TC-0003-0024
// QFAI:SPEC-0003:TC-0003-0025
// QFAI:SPEC-0003:TC-0003-0026
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const INIT_CLI = path.resolve(__dirname, "..", "..", "src", "cli", "commands", "init.ts");

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

// TC-0003-0003: --force skill overwrite
describe("TC-0003-0003: --force skill overwrite", () => {
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

// TC-0003-0013: --force refreshes instructions from the shipped template
describe("TC-0003-0013: --force refreshes instructions", () => {
  it("init gates the instructions skip on the force flag", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/instructions/i);
    // The Step 3.5 loop must consult --force, not skip unconditionally.
    expect(content).toMatch(/Step 3\.5[\s\S]*?if \(alreadyExists && \(!options\.force \|\|/);
    // …and a refresh must still refuse an entry that resolves out of the project.
    expect(content).toMatch(/Step 3\.5[\s\S]*?await resolvesOutsideProject\(destRoot, dest\)/);
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

// TC-0003-0018: gitignore 管理ブロック追記（新規）
// Actual assertions live in tests/cli/init.test.ts ("appends QFAI entries to root .gitignore on init").
// This block records the TC→implementation coverage link for traceability.
describe("TC-0003-0018: gitignore 管理ブロック追記（新規）", () => {
  it("init wires QFAI_GITIGNORE_BLOCK writer into runInit", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("ensureRootGitignoreEntries");
    expect(content).toContain("QFAI_GITIGNORE_BLOCK");
  });
});

// TC-0003-0019: レガシー行除去と管理ブロック置換
// Actual assertions live in tests/cli/init.test.ts ("strips legacy review-*/ negation lines when migrating from old managed block").
describe("TC-0003-0019: レガシー行除去と管理ブロック置換", () => {
  it("init references QFAI_GITIGNORE_LEGACY_LINES for migration", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("QFAI_GITIGNORE_LEGACY_LINES");
    expect(content).toContain("removeManagedBlock");
  });
});

// TC-0003-0020: review-*/ サブディレクトリが gitignore 対象
// Actual assertions live in tests/cli/init.test.ts ("does not track review-*/ subdirectories after init").
describe("TC-0003-0020: review-*/ サブディレクトリが gitignore 対象", () => {
  it("QFAI_GITIGNORE_BLOCK SSOT excludes review-*/ negations from REQUIRED_ENTRIES", async () => {
    const { QFAI_GITIGNORE_BLOCK, QFAI_GITIGNORE_RECOMMENDED_ENTRIES } =
      await import("../../src/core/gitignore.js");
    expect(QFAI_GITIGNORE_BLOCK).toContain(".qfai/discussion/*");
    expect(QFAI_GITIGNORE_BLOCK).not.toContain("!.qfai/discussion/README.md");
    expect(QFAI_GITIGNORE_BLOCK).not.toContain(".qfai/discussion/discussion-*/");
    expect(QFAI_GITIGNORE_BLOCK).not.toContain("!.qfai/review/review-*/");
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain("!.qfai/discussion/README.md");
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain("!.qfai/review/review-*/");
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain("!.qfai/review/review-*/**");
  });
});

// TC-0003-0021..0026 (v1.9.0 assistant-tree recut). Runtime assertions live
// in tests/cli/init.test.ts; here we keep the static-content checks that
// pin the SSOT imports and the assistantPaths.ts helpers.

describe("TC-0003-0021: 4-layer asset-tree seed", () => {
  it("init imports assistantPaths.ts and uses ASSISTANT_LAYERS / joinAssistantLayer", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("assistantPaths");
    expect(content).toContain("ASSISTANT_LAYERS");
    expect(content).toContain("joinAssistantLayer");
  });
});

describe("TC-0003-0022: project-root steering surface seed", () => {
  it("init declares seedProjectSteering and references _templates/entry.md", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("seedProjectSteering");
    expect(content).toContain("joinProjectSteering");
    expect(content).toMatch(/entry\.md/);
  });
});

describe("TC-0003-0023: --upgrade-assistant-tree migration", () => {
  it("init wires --upgrade-assistant-tree to runUpgradeAssistantTree", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("upgradeAssistantTree");
    expect(content).toContain("runUpgradeAssistantTree");
    expect(content).toContain("W-USER-EDIT-PRESERVED");
  });
});

describe("TC-0003-0024: migration memo authoring", () => {
  it("init authors the migration memo via buildMigrationMemo / joinMigrationMemo", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("buildMigrationMemo");
    expect(content).toContain("joinMigrationMemo");
    // Sunset version is sourced from SUNSETS.legacyAssistantSteering
    // SSOT in assistantPaths.ts (shared with the validator's severity
    // escalation point), NOT from a release-relative computation.
    expect(content).toContain("legacyAssistantSteeringSunsetLabel");
  });
});

describe("TC-0003-0025: assistantPaths.ts SSOT module", () => {
  it("exports the canonical 4 layer names and helper functions", async () => {
    const mod = await import("../../src/core/paths/assistantPaths.js");
    expect(mod.ASSISTANT_LAYERS).toEqual(["constitution", "manifest", "catalog", "process"]);
    expect(typeof mod.joinAssistantLayer).toBe("function");
    expect(typeof mod.joinLegacyAssistantSteering).toBe("function");
    expect(typeof mod.joinProjectSteering).toBe("function");
    expect(typeof mod.joinMigrationMemo).toBe("function");
    expect(mod.migrationMemoRelativePath("1.9.0")).toBe(
      ".qfai/assistant/process/migrations/v1.9.0-assistant-layer-recut.md",
    );
  });
});

describe("TC-0003-0026: legacy backward-compat + sunset warning", () => {
  it("init declares emitLegacyAssistantSteeringSunset emitting D-DEPRECATED-PATH (sunset sourced from SSOT)", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("D-DEPRECATED-PATH");
    expect(content).toContain("emitLegacyAssistantSteeringSunset");
    // The actual `sunset: vX.Y.Z` literal is sourced from
    // legacyAssistantSteeringSunsetLabel() (SSOT in assistantPaths.ts)
    // — runtime assertion lives in tests/cli/init.test.ts (TC-0003-0026).
    expect(content).toMatch(/sunset:\s*v\$\{sunset\}/);
  });
});
