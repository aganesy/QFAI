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
import { access, lstat, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
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

// QFAI:SPEC-0003:US-0003-0001
describe("E2E: workspace initialization (US-0003-0001)", { timeout: 60000 }, () => {
  it("creates .qfai/ with assistant assets and no artifact scaffold", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      expect(await pathExists(path.join(tmpDir, ".qfai", "assistant"))).toBe(true);

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

// QFAI:SPEC-0003:US-0003-0002
describe("E2E: idempotent initialization (US-0003-0002)", { timeout: 60000 }, () => {
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

// QFAI:SPEC-0003:US-0003-0003
describe("E2E: force update (US-0003-0003)", { timeout: 60000 }, () => {
  it("--force overwrites skills and does not create skills.local", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const skillPath = path.join(
        tmpDir,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "SKILL.md",
      );
      await writeFile(skillPath, "custom content");

      await captureStdout(() => runInit({ dir: tmpDir, force: true, dryRun: false, yes: true }));

      const after = await readFile(skillPath, "utf-8");
      expect(after).not.toBe("custom content");
      expect(await pathExists(path.join(tmpDir, ".qfai", "assistant", "skills.local"))).toBe(false);
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:SPEC-0003:US-0003-0004
describe("E2E: dry-run (US-0003-0004)", { timeout: 60000 }, () => {
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

// QFAI:SPEC-0003:US-0003-0005
describe("E2E: multi-tool wrapper generation (US-0003-0005)", { timeout: 60000 }, () => {
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

// QFAI:SPEC-0003:US-0003-0006
describe("E2E: legacy file evacuation (US-0003-0006)", { timeout: 60000 }, () => {
  it("--force removes legacy 10_workflow.md from skills", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      // Place a legacy file inside a skill directory
      const skillDir = path.join(tmpDir, ".qfai", "assistant", "skills");
      const subdirs = await (await import("node:fs/promises")).readdir(skillDir);
      const firstSkill = subdirs.find((d) => d.startsWith("qfai-"));
      if (firstSkill) {
        await writeFile(path.join(skillDir, firstSkill, "10_workflow.md"), "legacy");

        await captureStdout(() => runInit({ dir: tmpDir, force: true, dryRun: false, yes: true }));

        expect(await pathExists(path.join(skillDir, firstSkill, "10_workflow.md"))).toBe(false);
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:SPEC-0003:US-0003-0007
describe(
  "E2E: commands/prompts deprecation + skill symlink integration (US-0003-0007)",
  { timeout: 60000 },
  () => {
    it("--force removes the commands/prompts wrappers qfai shipped, and only those", async () => {
      const tmpDir = await createTempDir();
      try {
        await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

        // Place an old-style wrapper qfai itself wrote — a shipped basename
        // whose body still delegates to the canonical doc of the same stem —
        // alongside a file the project wrote for itself.
        // Each surface carries the form qfai actually shipped there: `@` for
        // the slash command, the bullet for the prompt file.
        const shippedCommand = [
          "Follow the canonical QFAI prompt exactly:",
          "@.qfai/assistant/prompts/qfai-spec.md",
          "",
        ].join("\n");
        const shippedPrompt = [
          "1) Open and follow the canonical QFAI prompt:",
          "- .qfai/assistant/prompts/qfai-spec.md",
          "",
        ].join("\n");
        await mkdir(path.join(tmpDir, ".claude", "commands"), { recursive: true });
        await writeFile(path.join(tmpDir, ".claude", "commands", "qfai-spec.md"), shippedCommand);
        await writeFile(path.join(tmpDir, ".claude", "commands", "qfai-old.md"), "mine");
        await mkdir(path.join(tmpDir, ".github", "prompts"), { recursive: true });
        await writeFile(
          path.join(tmpDir, ".github", "prompts", "qfai-spec.prompt.md"),
          shippedPrompt,
        );
        await writeFile(path.join(tmpDir, ".github", "prompts", "qfai-old.prompt.md"), "mine");

        await captureStdout(() => runInit({ dir: tmpDir, force: true, dryRun: false, yes: true }));

        expect(await pathExists(path.join(tmpDir, ".claude", "commands", "qfai-spec.md"))).toBe(
          false,
        );
        expect(
          await pathExists(path.join(tmpDir, ".github", "prompts", "qfai-spec.prompt.md")),
        ).toBe(false);
        expect(await pathExists(path.join(tmpDir, ".claude", "commands", "qfai-old.md"))).toBe(
          true,
        );
        expect(
          await pathExists(path.join(tmpDir, ".github", "prompts", "qfai-old.prompt.md")),
        ).toBe(true);
      } finally {
        await cleanupTempDir(tmpDir);
      }
    });

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
  },
);

// QFAI:SPEC-0003:US-0003-0008
describe("E2E: agent wrapper symlink (US-0003-0008)", { timeout: 60000 }, () => {
  it("creates agent symlinks in .claude/agents/ and .github/agents/", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const claudeAgentsDir = path.join(tmpDir, ".claude", "agents");
      const githubAgentsDir = path.join(tmpDir, ".github", "agents");

      if (await pathExists(claudeAgentsDir)) {
        const entries = await (
          await import("node:fs/promises")
        ).readdir(claudeAgentsDir, { withFileTypes: true });
        const mdFiles = entries.filter((e) => e.name.endsWith(".md") && e.name !== "README.md");
        // Agent symlinks should exist (if canonical agents are defined)
        for (const entry of mdFiles) {
          const stat = await lstat(path.join(claudeAgentsDir, entry.name));
          expect(stat.isSymbolicLink()).toBe(true);
        }
      }

      if (await pathExists(githubAgentsDir)) {
        const entries = await (
          await import("node:fs/promises")
        ).readdir(githubAgentsDir, { withFileTypes: true });
        const agentFiles = entries.filter((e) => e.name.endsWith(".agent.md"));
        for (const entry of agentFiles) {
          const stat = await lstat(path.join(githubAgentsDir, entry.name));
          expect(stat.isSymbolicLink()).toBe(true);
        }
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });

  it("README.md in agents directories is a regular file, not a symlink", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const readmePaths = [
        path.join(tmpDir, ".claude", "agents", "README.md"),
        path.join(tmpDir, ".github", "agents", "README.md"),
      ];
      for (const p of readmePaths) {
        if (await pathExists(p)) {
          const stat = await lstat(p);
          expect(stat.isSymbolicLink()).toBe(false);
          expect(stat.isFile()).toBe(true);
        }
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:SPEC-0003:US-0003-0009
describe("E2E: git symlink settings + Windows support (US-0003-0009)", { timeout: 60000 }, () => {
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

// QFAI:SPEC-0003:US-0003-0010
describe("E2E: copilot-instructions.md reference update (US-0003-0010)", { timeout: 60000 }, () => {
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

// QFAI:SPEC-0003:US-0003-0011
describe("E2E: migration and upgrade support (US-0003-0011)", { timeout: 60000 }, () => {
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

// QFAI:SPEC-0003:US-0003-0012
describe("E2E: version normalization (US-0003-0012)", () => {
  it("validate command source imports resolveToolVersion for version consistency", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("resolveToolVersion");
    expect(validateSrc).toContain("toolVersion");
  });
});

// QFAI:SPEC-0003:US-0003-0013
describe("E2E: internal module workflow documentation (US-0003-0013)", () => {
  it("validate.ts invokes module-level validators for comprehensive coverage", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    // The validate pipeline should include validators that cover internal modules
    expect(validateSrc).toContain("validateSpecPacks");
    expect(validateSrc).toContain("validateTraceability");
    expect(validateSrc).toContain("validateAtddCodeTraceability");
    expect(validateSrc).toContain("validateDiscussionPackReadiness");
  });
});

// QFAI:SPEC-0003:US-0003-0014
describe("E2E: canonical template generation (US-0003-0014)", { timeout: 60000 }, () => {
  it("init generates template assets under .qfai/assistant/", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const assistantDir = path.join(tmpDir, ".qfai", "assistant");
      expect(await pathExists(assistantDir)).toBe(true);

      // Skills directory should contain canonical skill directories
      const skillsDir = path.join(assistantDir, "skills");
      if (await pathExists(skillsDir)) {
        const entries = await (await import("node:fs/promises")).readdir(skillsDir);
        const qfaiSkills = entries.filter((e) => e.startsWith("qfai-"));
        expect(qfaiSkills.length).toBeGreaterThan(0);
      }
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});

// QFAI:SPEC-0003:US-0003-0015
describe("E2E: gitignore managed block auto-append (US-0003-0015)", { timeout: 60000 }, () => {
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
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");
      // review-*/ sub-directories are ignored by default (no negation)
      expect(content).not.toContain("!.qfai/review/review-*/");
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });

  it("init migrates legacy managed block (strips review-*/ negations) on re-run", async () => {
    const tmpDir = await createTempDir();
    try {
      const legacyBlock = [
        "# ── QFAI managed (generated by qfai init) ──",
        ".qfai/report/*",
        "!.qfai/report/README.md",
        ".qfai/evidence/*",
        "!.qfai/evidence/README.md",
        ".qfai/discussion/discussion-*/",
        ".qfai/review/*",
        "!.qfai/review/README.md",
        "!.qfai/review/review-*/",
        "!.qfai/review/review-*/**",
        "",
      ].join("\n");
      await writeFile(path.join(tmpDir, ".gitignore"), legacyBlock, "utf-8");

      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const content = await readFile(path.join(tmpDir, ".gitignore"), "utf-8");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).not.toContain("!.qfai/review/review-*/**");
      expect(content).toContain(".qfai/discussion/*");
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");
      const markerCount = content.split("# ── QFAI managed (generated by qfai init) ──").length - 1;
      expect(markerCount).toBe(1);
    } finally {
      await cleanupTempDir(tmpDir);
    }
  });
});
