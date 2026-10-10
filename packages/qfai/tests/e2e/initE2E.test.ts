/**
 * E2E: qfai init (spec-0001)
 *
 * Verifies high-level user journeys for the init command:
 * workspace scaffolding, idempotency, force update, dry-run,
 * multi-tool wrappers, legacy evacuation, symlink integration,
 * agent symlinks, git config, copilot-instructions update,
 * migration support, version normalization, module documentation,
 * and canonical template generation.
 */
import { access, lstat, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const _assetsRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function createTempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "qfai-e2e-init-"));
}

async function cleanupTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

// QFAI:BF-0001
describe("E2E: workspace initialization (US-0003-0001)", () => {
  it("creates the empty story tree with assistant assets", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      expect(await pathExists(path.join(tmpDir, ".qfai", "assistant"))).toBe(true);
      expect(await pathExists(path.join(tmpDir, "qfai.config.yaml"))).toBe(true);
      expect(await pathExists(path.join(tmpDir, ".qfai", "spec", "01_policy", "glossary.md"))).toBe(
        true,
      );
      expect(
        await pathExists(
          path.join(tmpDir, ".qfai", "spec", "02_business-flow", "business-flows.md"),
        ),
      ).toBe(true);
      expect(
        await pathExists(path.join(tmpDir, ".qfai", "spec", "03_contract", "contracts.md")),
      ).toBe(true);

      const artifactDirs = ["specs", "contracts", "discussion", "evidence", "report", "review"];
      for (const sub of artifactDirs) {
        const dirPath = path.join(tmpDir, ".qfai", sub);
        expect(await pathExists(dirPath), `Expected .qfai/${sub} not to exist`).toBe(false);
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });

  it("creates qfai.config.yaml in the project root", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));
      expect(await pathExists(path.join(tmpDir, "qfai.config.yaml"))).toBe(true);
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: idempotent initialization (US-0003-0002)", () => {
  it("second init skips existing files and preserves their content", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const configPath = path.join(tmpDir, "qfai.config.yaml");
      const contentBefore = await readFile(configPath, "utf-8");

      const output = await captureStdout(() =>
        runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }),
      );

      const contentAfter = await readFile(configPath, "utf-8");
      expect(contentAfter).toBe(contentBefore);
      expect(output).toContain("skipped");
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: force update (US-0003-0003)", () => {
  it("--force overwrites skills and does not create skill.local", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const skillPath = path.join(
        tmpDir,
        ".qfai",
        "assistant",
        "skill",
        "qfai-discussion",
        "SKILL.md",
      );
      await writeFile(skillPath, "custom content");

      await captureStdout(() => runInit({ dir: tmpDir, force: true, dryRun: false, yes: true }));

      const after = await readFile(skillPath, "utf-8");
      expect(after).not.toBe("custom content");
      expect(await pathExists(path.join(tmpDir, ".qfai", "assistant", "skill.local"))).toBe(false);
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: dry-run (US-0003-0004)", () => {
  it("--dry-run does not create any files", async () => {
    const tmpDir = await createTempDir();
    try {
      const output = await captureStdout(() =>
        runInit({ dir: tmpDir, force: false, dryRun: true, yes: true }),
      );

      expect(await pathExists(path.join(tmpDir, ".qfai"))).toBe(false);
      expect(output).toContain("dry-run");
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: multi-tool wrapper generation (US-0003-0005)", () => {
  it("generates wrapper directories for Claude, Copilot, Codex, and Agents", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const dirs = [".claude", ".github", ".codex", ".agents"];
      for (const d of dirs) {
        expect(await pathExists(path.join(tmpDir, d)), `Expected ${d} to exist`).toBe(true);
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: skill symlink integration", () => {
  it("creates skill symlinks in integration directories", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const integDirs = [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"];
      for (const integDir of integDirs) {
        const fullDir = path.join(tmpDir, integDir);
        if (await pathExists(fullDir)) {
          const entries = await (
            await import("node:fs/promises")
          ).readdir(fullDir, { withFileTypes: true });
          const qfaiEntries = entries.filter((e) => e.name.startsWith("qfai-"));
          expect(qfaiEntries.length).toBeGreaterThan(0);
        }
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: agent wrapper symlink (US-0003-0006)", () => {
  it("creates agent symlinks in .claude/agents/ and .github/agents/", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const claudeAgentsDir = path.join(tmpDir, ".claude", "agents");
      const githubAgentsDir = path.join(tmpDir, ".github", "agents");

      // Both directories are what the story asks for, and every assertion below
      // stands behind a check that the directory is there. Without this, a run
      // that wrote neither passed every one of them.
      expect(await pathExists(claudeAgentsDir), claudeAgentsDir).toBe(true);
      expect(await pathExists(githubAgentsDir), githubAgentsDir).toBe(true);

      if (await pathExists(claudeAgentsDir)) {
        const entries = await (
          await import("node:fs/promises")
        ).readdir(claudeAgentsDir, { withFileTypes: true });
        const mdFiles = entries.filter((e) => e.name.endsWith(".md") && e.name !== "README.md");
        expect(mdFiles.length).toBeGreaterThan(0);
        for (const entry of mdFiles) {
          const stat = await lstat(path.join(claudeAgentsDir, entry.name));
          expect(stat.isSymbolicLink()).toBe(true);
          expect((await readlink(path.join(claudeAgentsDir, entry.name))).replace(/\\/g, "/")).toBe(
            `../../.qfai/assistant/agent/${entry.name}`,
          );
        }
      }

      if (await pathExists(githubAgentsDir)) {
        const entries = await (
          await import("node:fs/promises")
        ).readdir(githubAgentsDir, { withFileTypes: true });
        const agentFiles = entries.filter((e) => e.name.endsWith(".agent.md"));
        expect(agentFiles.length).toBeGreaterThan(0);
        for (const entry of agentFiles) {
          const stat = await lstat(path.join(githubAgentsDir, entry.name));
          expect(stat.isSymbolicLink()).toBe(true);
          expect((await readlink(path.join(githubAgentsDir, entry.name))).replace(/\\/g, "/")).toBe(
            `../../.qfai/assistant/agent/${entry.name.replace(/\.agent\.md$/, ".md")}`,
          );
        }
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });

  it("writes no README into any agent directory", async () => {
    // The four directories hold agent cards, and what they need to say is said
    // where the reader already is — the entry points that route there, and the
    // rule masters those cite. A README beside them is a second place to say it,
    // and `scripts/check-tracked-readmes.mjs` refuses one in this repository for
    // that reason.
    //
    // This case read two of the four and guarded every assertion behind an
    // existence check, so it passed over the empty set and would have passed over
    // any tree at all.
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const readmePaths = [
        path.join(tmpDir, ".agents", "README.md"),
        path.join(tmpDir, ".codex", "README.md"),
        path.join(tmpDir, ".claude", "agents", "README.md"),
        path.join(tmpDir, ".github", "agents", "README.md"),
      ];
      const written: string[] = [];
      for (const p of readmePaths) {
        if (await pathExists(p)) written.push(path.relative(tmpDir, p));
      }
      expect(written).toEqual([]);
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: git symlink settings + Windows support (US-0003-0009)", () => {
  it("init runs without error on a non-git directory (git config is skipped)", async () => {
    const tmpDir = await createTempDir();
    try {
      // tmpDir is not a git repo, so git config should be skipped gracefully
      await expect(
        captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true })),
      ).resolves.toBeDefined();
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: copilot-instructions.md reference update (US-0003-0010)", () => {
  it("generated copilot-instructions.md references .github/skills/ not .github/prompts/", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const copilotPath = path.join(tmpDir, ".github", "copilot-instructions.md");
      if (await pathExists(copilotPath)) {
        const content = await readFile(copilotPath, "utf-8");
        expect(content).toContain(".github/skills/");
        expect(content).not.toContain(".github/prompts/");
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

describe("E2E: migration and upgrade support", () => {
  it("init on a fresh directory completes without migration errors", async () => {
    const tmpDir = await createTempDir();
    try {
      const output = await captureStdout(() =>
        runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }),
      );
      expect(output).toContain("done");
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

describe("E2E: version normalization", () => {
  it("validate command source imports resolveToolVersion for version consistency", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("resolveToolVersion");
    expect(validateSrc).toContain("toolVersion");
  });
});

describe("E2E: internal module workflow documentation", () => {
  it("validate.ts invokes module-level validators for comprehensive coverage", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("validateStoryTreeStructure");
    expect(validateSrc).toContain("validateStoryTreeContractReferences");
    expect(validateSrc).toContain("validateStoryTreeObligations");
    expect(validateSrc).toContain("validateDiscussionPackReadiness");
  });
});

describe("E2E: canonical template generation", () => {
  it("init generates template assets under .qfai/assistant/", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const assistantDir = path.join(tmpDir, ".qfai", "assistant");
      expect(await pathExists(assistantDir)).toBe(true);

      const skillsDir = path.join(assistantDir, "skill");
      const entries = await (await import("node:fs/promises")).readdir(skillsDir);
      const qfaiSkills = entries.filter((e) => e.startsWith("qfai-"));
      expect(qfaiSkills.length).toBeGreaterThan(0);
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:BF-0001
describe("E2E: gitignore managed block auto-append (US-0003-0015)", () => {
  it("init appends QFAI managed block to root .gitignore and ignores review-*/ by default", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const gitignorePath = path.join(tmpDir, ".gitignore");
      expect(await pathExists(gitignorePath)).toBe(true);
      const content = await readFile(gitignorePath, "utf-8");

      expect(content).toContain("# ── QFAI managed (generated by qfai init) ──");
      expect(content).toContain(".qfai/report/*");
      expect(content).toContain(".qfai/evidence/*");
      expect(content).toContain(".qfai/review/*");
      expect(content).toContain(".qfai/discussion/*");
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});
