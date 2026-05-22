import {
  access,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  rm,
  writeFile,
  symlink,
} from "node:fs/promises";
import { execFile as execFileCb } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { runInit } from "../../src/cli/commands/init.js";
import { copyTemplateTree } from "../../src/cli/lib/fs.js";
import { captureStdout } from "../helpers/stdout.js";
import { QFAI_GITIGNORE_MARKER } from "../../src/core/gitignore.js";

const REQUIRED_SKILLS = [
  "qfai-configure",
  "qfai-discussion",
  "qfai-sdd",
  "qfai-atdd",
  "qfai-prototyping",
  "qfai-implement",
  "qfai-verify",
];

const execFile = promisify(execFileCb);

async function expectSymlink(linkPath: string): Promise<void> {
  const stat = await lstat(linkPath);
  expect(stat.isSymbolicLink()).toBe(true);
}

async function expectSymlinkTarget(linkPath: string, expectedFragment: string): Promise<void> {
  const target = await readlink(linkPath);
  const normalized = target.replace(/\\/g, "/");
  expect(normalized).toContain(expectedFragment);
}

// This suite exercises end-to-end init flows with extensive filesystem I/O
// (temp dirs, template copying, globbing), so we use a higher timeout to
// avoid flaky failures on slow or heavily loaded CI runners.
describe("qfai init", { timeout: 60000 }, () => {
  it("fails with guidance when conflicts exist and --force is missing", async () => {
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-src-"));
    const destRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-dest-"));
    try {
      await mkdir(path.join(sourceRoot, "nested"), { recursive: true });
      await writeFile(path.join(sourceRoot, "nested", "template.txt"), "sample");

      await copyTemplateTree(sourceRoot, destRoot, {
        force: false,
        dryRun: false,
      });

      await expect(
        copyTemplateTree(sourceRoot, destRoot, { force: false, dryRun: false }),
      ).rejects.toThrow(/--force/);
    } finally {
      await rm(sourceRoot, { recursive: true, force: true });
      await rm(destRoot, { recursive: true, force: true });
    }
  });

  it("appends QFAI entries to root .gitignore on init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const gitignorePath = path.join(root, ".gitignore");
      const content = await readFile(gitignorePath, "utf-8");

      expect(content).toContain(QFAI_GITIGNORE_MARKER);
      expect(content).toContain(".qfai/report/*");
      expect(content).not.toContain("!.qfai/report/README.md");
      expect(content).toContain(".qfai/evidence/*");
      expect(content).not.toContain("!.qfai/evidence/README.md");
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/README.md");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).not.toContain("!.qfai/review/review-*/**");
      expect(content).toContain(".qfai/discussion/*");
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");

      // No subdirectory .gitignore files should be created
      await expect(access(path.join(root, ".qfai", "review", ".gitignore"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(access(path.join(root, ".qfai", "report", ".gitignore"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".qfai", "evidence", ".gitignore")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".qfai", "discussion", ".gitignore")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0003-0001 (alias) — qfai init ships GitHub Actions workflow for qfai validate
  it("ships .github/workflows/qfai-validate.yml on init (spec-0003)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-workflow-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const workflowPath = path.join(root, ".github", "workflows", "qfai-validate.yml");
      await expect(access(workflowPath)).resolves.toBeUndefined();

      const content = await readFile(workflowPath, "utf-8");
      expect(content).toContain("qfai validate --profile full --fail-on error");
      expect(content).toContain("actions/checkout@v4");
      expect(content).toContain("actions/setup-node@v4");
      expect(content).toContain("QFAI-TEST-001");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores every discussion child on init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await execFile("git", ["init"], { cwd: root });
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const discussionDir = path.join(root, ".qfai", "discussion");
      const directUiuxFile = path.join(discussionDir, "uiux", "40_screen_contracts.md");
      const generatedPackFile = path.join(
        discussionDir,
        "discussion-20260423174107000",
        "uiux",
        "40_screen_contracts.md",
      );

      await mkdir(path.dirname(directUiuxFile), { recursive: true });
      await mkdir(path.dirname(generatedPackFile), { recursive: true });
      await writeFile(directUiuxFile, "direct uiux");
      await writeFile(generatedPackFile, "generated pack uiux");

      const checkIgnore = async (relativePath: string): Promise<string | null> => {
        try {
          const { stdout } = await execFile("git", ["check-ignore", "-v", "--", relativePath], {
            cwd: root,
          });
          return stdout.trim();
        } catch (error: unknown) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: number }).code === 1
          ) {
            return null;
          }
          throw error;
        }
      };

      expect(await checkIgnore(".qfai/discussion/README.md")).toContain(".qfai/discussion/*");
      expect(await checkIgnore(".qfai/discussion/uiux/40_screen_contracts.md")).toContain(
        ".qfai/discussion/*",
      );
      expect(
        await checkIgnore(
          ".qfai/discussion/discussion-20260423174107000/uiux/40_screen_contracts.md",
        ),
      ).toContain(".qfai/discussion/*");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not duplicate QFAI entries on repeated init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      const markerCount = content.split(QFAI_GITIGNORE_MARKER).length - 1;
      expect(markerCount).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves existing .gitignore content when appending", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const gitignorePath = path.join(root, ".gitignore");
      await writeFile(gitignorePath, "node_modules/\ndist/\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(gitignorePath, "utf-8");
      expect(content).toMatch(/^node_modules\/\n/);
      expect(content).toContain(".qfai/report/*");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates template additions with symlinks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Regular files (canonical sources)
      const expectedRegularFiles = [
        path.join(root, ".qfai", "assistant", "skills", "qfai-configure", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "instructions", "constitution.md"),
        path.join(root, ".qfai", "assistant", "agents", "delivery-planner.md"),
        path.join(root, ".qfai", "assistant", "steering", "review-gate.rules.yml"),
        path.join(root, ".qfai", "assistant", "steering", "agent-catalog.yml"),
        path.join(root, ".qfai", "assistant", "steering", "agent-routing.yml"),
        path.join(root, ".qfai", "assistant", "steering", "review-profiles.yml"),
        path.join(
          root,
          ".qfai",
          "assistant",
          "skills",
          "qfai-discussion",
          "references",
          "rcp_footer.md",
        ),
        path.join(root, ".qfai", "assistant", "skills", "qfai-sdd", "references", "rcp_footer.md"),
        // README files are regular files
        path.join(root, ".claude", "agents", "README.md"),
        path.join(root, ".github", "agents", "README.md"),
        path.join(root, ".github", "copilot-instructions.md"),
        path.join(root, ".codex", "README.md"),
        path.join(root, ".agents", "README.md"),
      ];

      for (const filePath of expectedRegularFiles) {
        await access(filePath);
      }

      // Skill directory symlinks
      const skillSymlinks = [
        path.join(root, ".claude", "skills", "qfai-configure"),
        path.join(root, ".agents", "skills", "qfai-configure"),
        path.join(root, ".codex", "skills", "qfai-configure"),
        path.join(root, ".github", "skills", "qfai-configure"),
      ];

      for (const symlinkPath of skillSymlinks) {
        await expectSymlink(symlinkPath);
        await expectSymlinkTarget(symlinkPath, ".qfai/assistant/skills/qfai-configure");
      }

      // Skill symlink resolves to actual skill directory (SKILL.md is accessible)
      const skillMdViaSymlink = path.join(root, ".claude", "skills", "qfai-configure", "SKILL.md");
      await access(skillMdViaSymlink);

      // Agent file symlinks
      const claudeAgent = path.join(root, ".claude", "agents", "delivery-planner.md");
      await expectSymlink(claudeAgent);
      await expectSymlinkTarget(claudeAgent, ".qfai/assistant/agents/delivery-planner.md");

      const githubAgent = path.join(root, ".github", "agents", "delivery-planner.agent.md");
      await expectSymlink(githubAgent);
      await expectSymlinkTarget(githubAgent, ".qfai/assistant/agents/delivery-planner.md");

      // commands/ and prompts/ are NOT generated
      await expect(access(path.join(root, ".qfai", "assistant", "prompts"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      for (const skillId of REQUIRED_SKILLS) {
        await expect(
          access(path.join(root, ".claude", "commands", `${skillId}.md`)),
        ).rejects.toMatchObject({
          code: "ENOENT",
        });
        await expect(
          access(path.join(root, ".github", "prompts", `${skillId}.prompt.md`)),
        ).rejects.toMatchObject({
          code: "ENOENT",
        });
      }

      await expect(access(path.join(root, ".qfai", "report", "README.md"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not create artifact scaffold outside assistant assets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const scaffoldFiles = await fg(
        [
          ".qfai/specs/**/*",
          ".qfai/discussion/**/*",
          ".qfai/report/**/*",
          ".qfai/review/**/*",
          ".qfai/contracts/**/*",
          ".qfai/evidence/**/*",
        ],
        {
          cwd: root,
          onlyFiles: true,
          dot: true,
        },
      );
      expect(scaffoldFiles).toEqual([]);

      await expect(access(path.join(root, ".qfai", "specs", "_policies"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(access(path.join(root, ".qfai", "specs", "spec-XXXX"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".qfai", "assistant", "skills.local")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });

      await expect(access(path.join(root, ".qfai", "discussions"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("is create-only for root/ and .qfai/ (skips existing files)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const existingConfig = path.join(root, "qfai.config.yaml");
      await writeFile(existingConfig, "custom config\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readFile(existingConfig, "utf-8");
      expect(after).toBe("custom config\n");

      const existingConstitution = path.join(
        root,
        ".qfai",
        "assistant",
        "instructions",
        "constitution.md",
      );
      await writeFile(existingConstitution, "custom constitution\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const constitutionAfter = await readFile(existingConstitution, "utf-8");
      expect(constitutionAfter).toBe("custom constitution\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("overwrites skills only when --force is provided", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const skillSample = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "SKILL.md",
      );
      await writeFile(skillSample, "custom skills\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const afterNoForce = await readFile(skillSample, "utf-8");
      expect(afterNoForce).toBe("custom skills\n");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      const afterForce = await readFile(skillSample, "utf-8");

      const template = await readFile(
        path.join(
          getInitAssetsDir(),
          ".qfai",
          "assistant",
          "skills",
          "qfai-discussion",
          "SKILL.md",
        ),
        "utf-8",
      );

      expect(afterForce).toBe(template);
      expect(afterForce).not.toBe("custom skills\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("recreates symlinks with --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Verify symlinks exist
      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      await expectSymlink(skillLink);

      // Run again with --force
      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      // Symlinks should still be valid
      await expectSymlink(skillLink);
      await expectSymlinkTarget(skillLink, ".qfai/assistant/skills/qfai-configure");

      // Content accessible through symlink
      const skillMd = path.join(skillLink, "SKILL.md");
      await access(skillMd);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes deprecated commands/prompts wrappers on --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Create legacy commands/prompts files
      const deprecatedClaude = path.join(root, ".claude", "commands", "qfai-spec.md");
      const deprecatedGithub = path.join(root, ".github", "prompts", "qfai-spec.prompt.md");
      const deprecatedCanonicalClaude = path.join(root, ".claude", "commands", "qfai-configure.md");
      const deprecatedCanonicalGithub = path.join(
        root,
        ".github",
        "prompts",
        "qfai-configure.prompt.md",
      );

      await mkdir(path.dirname(deprecatedClaude), { recursive: true });
      await mkdir(path.dirname(deprecatedGithub), { recursive: true });
      await writeFile(deprecatedClaude, "legacy wrapper\n", "utf-8");
      await writeFile(deprecatedGithub, "legacy wrapper\n", "utf-8");
      await writeFile(deprecatedCanonicalClaude, "legacy wrapper\n", "utf-8");
      await writeFile(deprecatedCanonicalGithub, "legacy wrapper\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      // ALL commands/prompts qfai-*.md files should be removed
      await expect(access(deprecatedClaude)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(deprecatedGithub)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(deprecatedCanonicalClaude)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(deprecatedCanonicalGithub)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("replaces old non-symlink skill wrappers with symlinks on --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Manually create old-style wrapper directory (non-symlink)
      const oldWrapper = path.join(root, ".codex", "skills", "qfai-configure");
      await mkdir(oldWrapper, { recursive: true });
      await writeFile(path.join(oldWrapper, "SKILL.md"), "old wrapper\n", "utf-8");

      // Create the canonical skill source
      await mkdir(path.join(root, ".qfai", "assistant", "skills", "qfai-configure"), {
        recursive: true,
      });
      await writeFile(
        path.join(root, ".qfai", "assistant", "skills", "qfai-configure", "SKILL.md"),
        "canonical\n",
        "utf-8",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      // Old directory should be replaced with symlink
      const stat = await lstat(path.join(root, ".codex", "skills", "qfai-configure"));
      expect(stat.isSymbolicLink()).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes legacy 10_workflow.md from skills when --force is provided", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacyPath = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "10_workflow.md",
      );
      await writeFile(legacyPath, "legacy workflow\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(access(legacyPath)).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not remove custom codex skill on --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Custom (non-qfai) skill directory should not be touched
      const customCodexSkill = path.join(root, ".codex", "skills", "custom-skill", "SKILL.md");
      await mkdir(path.dirname(customCodexSkill), { recursive: true });
      await writeFile(customCodexSkill, "custom codex skill\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(access(customCodexSkill)).resolves.toBeUndefined();
      const after = await readFile(customCodexSkill, "utf-8");
      expect(after).toBe("custom codex skill\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports legacy cleanup as planned in dry-run and keeps files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacyPath = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "10_workflow.md",
      );
      await writeFile(legacyPath, "legacy workflow\n", "utf-8");

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: true, yes: true });
      });

      expect(output).toContain("would remove legacy files");
      expect(output).toContain("would remove paths:");
      await access(legacyPath);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not overwrite specs/contracts even with --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const specPath = path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md");
      const uiContractPath = path.join(root, ".qfai", "contracts", "ui", "ui-0001-sample.yaml");

      const customizedSpec = "customized spec\n";
      const customizedContract = "customized contract\n";
      await mkdir(path.dirname(specPath), { recursive: true });
      await mkdir(path.dirname(uiContractPath), { recursive: true });
      await writeFile(specPath, customizedSpec, "utf-8");
      await writeFile(uiContractPath, customizedContract, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      expect(await readFile(specPath, "utf-8")).toBe(customizedSpec);
      expect(await readFile(uiContractPath, "utf-8")).toBe(customizedContract);

      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      expect(await readFile(specPath, "utf-8")).toBe(customizedSpec);
      expect(await readFile(uiContractPath, "utf-8")).toBe(customizedContract);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses relative symlink targets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      const target = await readlink(skillLink);

      // Target should be relative (no absolute path)
      expect(path.isAbsolute(target)).toBe(false);
      // Target should contain the canonical source path
      const normalized = target.replace(/\\/g, "/");
      expect(normalized).toContain(".qfai/assistant/skills/qfai-configure");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("skips valid symlinks on re-run without --force (idempotent)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      const targetBefore = await readlink(skillLink);

      // Re-run without --force
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Symlink should still be valid
      await expectSymlink(skillLink);
      const targetAfter = await readlink(skillLink);
      expect(targetAfter).toBe(targetBefore);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("recreates broken symlinks without --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Break a symlink by removing the target and re-creating with wrong target
      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      await rm(skillLink, { recursive: true, force: true });
      await symlink("../../nonexistent/path", skillLink, "dir");

      // Verify it's broken
      const brokenStat = await lstat(skillLink);
      expect(brokenStat.isSymbolicLink()).toBe(true);

      // Re-run — should fix the broken symlink
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      await expectSymlink(skillLink);
      await expectSymlinkTarget(skillLink, ".qfai/assistant/skills/qfai-configure");
      // Should be resolvable now
      await access(path.join(skillLink, "SKILL.md"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("copilot-instructions.md references .github/skills/ instead of .github/prompts/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const copilotPath = path.join(root, ".github", "copilot-instructions.md");
      const content = await readFile(copilotPath, "utf-8");

      expect(content).toContain(".github/skills/");
      expect(content).not.toContain(".github/prompts/");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps README.md as regular files (not symlinked)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const readmePaths = [
        path.join(root, ".claude", "agents", "README.md"),
        path.join(root, ".github", "agents", "README.md"),
        path.join(root, ".agents", "README.md"),
        path.join(root, ".codex", "README.md"),
      ];

      for (const readmePath of readmePaths) {
        const stat = await lstat(readmePath);
        expect(stat.isSymbolicLink()).toBe(false);
        expect(stat.isFile()).toBe(true);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0001
  it("New repo init creates both instructions files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const codeReviewPath = path.join(
        root,
        ".github",
        "instructions",
        "code-review.instructions.md",
      );
      const principlesPath = path.join(
        root,
        ".github",
        "instructions",
        "principles.instructions.md",
      );

      // Both files exist
      await access(codeReviewPath);
      await access(principlesPath);

      // Both files contain valid YAML frontmatter with applyTo and excludeAgent
      const codeReview = await readFile(codeReviewPath, "utf-8");
      const principles = await readFile(principlesPath, "utf-8");

      expect(codeReview).toContain("applyTo:");
      expect(codeReview).toContain("excludeAgent:");
      expect(principles).toContain("applyTo:");
      expect(principles).toContain("excludeAgent:");

      // code-review contains severity prefix definitions
      expect(codeReview).toContain("[BLOCKER]");
      expect(codeReview).toContain("[MAJOR]");

      // principles contains SOLID/KISS/YAGNI/DRY
      expect(principles).toContain("SOLID");
      expect(principles).toContain("KISS");
      expect(principles).toContain("YAGNI");
      expect(principles).toContain("DRY");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0002
  it("Skip when instructions files exist", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "custom-cr\n", "utf-8");
      await writeFile(path.join(instrDir, "principles.instructions.md"), "custom-pr\n", "utf-8");

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      // Both files retain their original custom content
      expect(await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8")).toBe(
        "custom-cr\n",
      );
      expect(await readFile(path.join(instrDir, "principles.instructions.md"), "utf-8")).toBe(
        "custom-pr\n",
      );
      // Report shows both as skipped
      expect(output).toContain("skipped");
      expect(output).toContain("code-review.instructions.md");
      expect(output).toContain("principles.instructions.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0003
  it("--force does not override instructions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "custom-cr\n", "utf-8");
      await writeFile(path.join(instrDir, "principles.instructions.md"), "custom-pr\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8")).toBe(
        "custom-cr\n",
      );
      expect(await readFile(path.join(instrDir, "principles.instructions.md"), "utf-8")).toBe(
        "custom-pr\n",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0004
  it("Directory auto-creation for instructions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Case A: No .github/ directory at all
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const instrDir = path.join(root, ".github", "instructions");
      await access(instrDir);
      await access(path.join(instrDir, "code-review.instructions.md"));
      await access(path.join(instrDir, "principles.instructions.md"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0005
  it("Partial existing instructions files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "custom-cr\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // code-review retains custom content
      expect(await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8")).toBe(
        "custom-cr\n",
      );
      // principles is created from template
      const principles = await readFile(path.join(instrDir, "principles.instructions.md"), "utf-8");
      expect(principles).toContain("SOLID");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0006
  it("Report includes instructions in counts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Case A: New repo, no instructions
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output).toContain("created:");
      // Activation guidance proves instructions were included in created
      expect(output).toContain("Copilot コードレビュー用 instructions を作成しました。");

      // Case B: Both files exist — re-run
      const output2 = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output2).toContain("code-review.instructions.md");
      expect(output2).toContain("principles.instructions.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0007
  it("--dry-run does not write instructions files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: true, yes: true });

      await expect(
        access(path.join(root, ".github", "instructions", "code-review.instructions.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await expect(
        access(path.join(root, ".github", "instructions", "principles.instructions.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0008
  it("Instructions idempotency (3 consecutive runs)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Run 1: Both files created
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const instrDir = path.join(root, ".github", "instructions");
      const crAfterRun1 = await readFile(
        path.join(instrDir, "code-review.instructions.md"),
        "utf-8",
      );
      const prAfterRun1 = await readFile(
        path.join(instrDir, "principles.instructions.md"),
        "utf-8",
      );

      // Run 2: Both files skipped
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const crAfterRun2 = await readFile(
        path.join(instrDir, "code-review.instructions.md"),
        "utf-8",
      );
      const prAfterRun2 = await readFile(
        path.join(instrDir, "principles.instructions.md"),
        "utf-8",
      );
      expect(crAfterRun2).toBe(crAfterRun1);
      expect(prAfterRun2).toBe(prAfterRun1);

      // Run 3: Both files skipped
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const crAfterRun3 = await readFile(
        path.join(instrDir, "code-review.instructions.md"),
        "utf-8",
      );
      const prAfterRun3 = await readFile(
        path.join(instrDir, "principles.instructions.md"),
        "utf-8",
      );
      expect(crAfterRun3).toBe(crAfterRun1);
      expect(prAfterRun3).toBe(prAfterRun1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0009
  it("SDD marker present in templates", async () => {
    const assetsRoot = getInitAssetsDir();
    const instructionsDir = path.join(assetsRoot, ".github", "instructions");

    const codeReview = await readFile(
      path.join(instructionsDir, "code-review.instructions.md"),
      "utf-8",
    );
    const principles = await readFile(
      path.join(instructionsDir, "principles.instructions.md"),
      "utf-8",
    );

    expect(codeReview).toContain("<!-- qfai:language-rules -->");
    expect(principles).toContain("<!-- qfai:language-rules -->");

    // Markers are positioned near the end of each file
    const codeReviewLines = codeReview.trimEnd().split("\n");
    const principlesLines = principles.trimEnd().split("\n");
    const codeReviewMarkerIdx = codeReviewLines.findIndex((l: string) =>
      l.includes("<!-- qfai:language-rules -->"),
    );
    const principlesMarkerIdx = principlesLines.findIndex((l: string) =>
      l.includes("<!-- qfai:language-rules -->"),
    );

    // Marker should be in the last 5 lines
    expect(codeReviewLines.length - codeReviewMarkerIdx).toBeLessThanOrEqual(5);
    expect(principlesLines.length - principlesMarkerIdx).toBeLessThanOrEqual(5);
  });

  // QFAI:SPEC-0003:TC-0003-0010
  it("Activation guidance printed on create", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // First run: guidance should appear
      const output1 = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output1).toContain("@github-copilot review");

      // Second run: guidance should NOT appear (files already exist)
      const output2 = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output2).not.toContain("@github-copilot review");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0011
  it("Empty file treated as existing (instructions)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The empty file is not overwritten
      const content = await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8");
      expect(content).toBe("");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0012
  it("current init outputs remain stable after additive instruction assets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // All previously expected files still exist (instructions files are additive only)
      const expectedRegularFiles = [
        path.join(root, ".qfai", "assistant", "skills", "qfai-configure", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "instructions", "constitution.md"),
        path.join(root, ".qfai", "assistant", "agents", "delivery-planner.md"),
        path.join(root, ".github", "copilot-instructions.md"),
        path.join(root, ".codex", "README.md"),
        path.join(root, ".agents", "README.md"),
      ];

      for (const filePath of expectedRegularFiles) {
        await access(filePath);
      }

      // Skill symlinks still work
      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      await expectSymlink(skillLink);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("appends QFAI entries to root .gitignore on first init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      expect(content).toContain("# ── QFAI managed (generated by qfai init) ──");
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/README.md");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).toContain(".qfai/report/*");
      expect(content).toContain(".qfai/evidence/*");
      expect(content).toContain(".qfai/discussion/*");
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not duplicate QFAI entries on re-init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      const markerCount = content.split("# ── QFAI managed (generated by qfai init) ──").length - 1;
      expect(markerCount).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("appends QFAI entries to existing .gitignore", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await writeFile(path.join(root, ".gitignore"), "node_modules/\n", "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      expect(content).toMatch(/^node_modules\//m);
      expect(content).toContain(".qfai/review/*");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("strips legacy review-*/ negation lines when migrating from old managed block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
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
      await writeFile(path.join(root, ".gitignore"), legacyBlock, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      const markerCount = content.split(QFAI_GITIGNORE_MARKER).length - 1;
      expect(markerCount).toBe(1);
      expect(content).toContain(".qfai/discussion/*");
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).not.toContain("!.qfai/review/review-*/**");
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/README.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-1.4.1 — fresh init creates DESIGN.md at root with template byte content
  it("ships DESIGN.md at root with template byte content (TC-1.4.1)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const designMdPath = path.join(root, "DESIGN.md");
      const templatePath = path.join(getInitAssetsDir(), "root", "DESIGN.md");

      const writtenBytes = await readFile(designMdPath);
      const templateBytes = await readFile(templatePath);
      expect(writtenBytes.equals(templateBytes)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-1.4.2 — re-init without --force preserves user-modified DESIGN.md
  it("preserves user-modified DESIGN.md across re-init without --force (TC-1.4.2)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const designMdPath = path.join(root, "DESIGN.md");
      const userContent = "# my brand\n";
      await writeFile(designMdPath, userContent, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(designMdPath, "utf-8")).toBe(userContent);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-1.4.3 — --force does NOT overwrite a user-modified DESIGN.md
  it("--force does not overwrite a user-modified DESIGN.md (TC-1.4.3)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const designMdPath = path.join(root, "DESIGN.md");
      const userContent = "custom design\n";
      await writeFile(designMdPath, userContent, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(designMdPath, "utf-8")).toBe(userContent);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-1.4.4 — dry-run does not write DESIGN.md
  it("dry-run does not write DESIGN.md (TC-1.4.4)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: true, yes: true });
      await expect(access(path.join(root, "DESIGN.md"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-1.4.5 — init reports DESIGN.md as created on first run, skipped on second run
  it("reports DESIGN.md as created on first run and skipped on second run (TC-1.4.5)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      const firstRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(firstRun).toMatch(/created:\s*\d+/);

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(secondRun).toContain("skipped paths:");
      expect(secondRun).toContain("DESIGN.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not track review-*/ subdirectories after init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      // .qfai/review/* ignores everything; no negation whitelists review-*/ back
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).not.toContain("!.qfai/review/review-*/**");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0021 (TDD-0021): 4-layer asset-tree seed
  it("TC-0003-0021 (TDD-0021): seeds .qfai/assistant/{constitution,manifest,catalog,process}/.gitkeep on fresh init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0021-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      for (const layer of ["constitution", "manifest", "catalog", "process"]) {
        const gitkeep = path.join(root, ".qfai", "assistant", layer, ".gitkeep");
        const stat = await lstat(gitkeep);
        expect(stat.isFile()).toBe(true);
        const body = await readFile(gitkeep, "utf-8");
        expect(body).toContain(`.qfai/assistant/${layer}/`);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0022 (TDD-0022): project-root .qfai/steering/ seed
  it("TC-0003-0022 (TDD-0022): seeds project-root .qfai/steering/ surface (README + .gitkeep + _templates/entry.md)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0022-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const readme = await readFile(path.join(root, ".qfai", "steering", "README.md"), "utf-8");
      expect(readme).toContain("AI work-log surface");
      expect(readme).toContain("decision");
      expect(readme).toContain("handoff");
      const gitkeepStat = await lstat(path.join(root, ".qfai", "steering", ".gitkeep"));
      expect(gitkeepStat.isFile()).toBe(true);
      const tplBody = await readFile(
        path.join(root, ".qfai", "steering", "_templates", "entry.md"),
        "utf-8",
      );
      expect(tplBody).toContain("id: entry-XXXX");
      expect(tplBody).toContain("kind: decision");
      expect(tplBody).toMatch(/promote-to:/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0022 (TDD-0022): re-init preserves user edits in .qfai/steering/
  it("TC-0003-0022 (TDD-0022): re-init does not overwrite user edits in .qfai/steering/README.md", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0022b-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const readmePath = path.join(root, ".qfai", "steering", "README.md");
      const userEdit = "# my custom worklog notes\n";
      await writeFile(readmePath, userEdit, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const after = await readFile(readmePath, "utf-8");
      expect(after).toBe(userEdit);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): --upgrade-assistant-tree migration
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree copies legacy steering/ files into the 4-layer tree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023-"));
    try {
      // Simulate a legacy v1.8 layout: seed .qfai/assistant/steering/ with content
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "test-layers.md"), "# legacy test layers\n", "utf-8");
      await writeFile(path.join(legacy, "agent-catalog.yml"), "agents: []\n", "utf-8");

      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });

      const newCatalog = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "test-layers.md"),
        "utf-8",
      );
      expect(newCatalog).toContain("legacy test layers");
      const newManifest = await readFile(
        path.join(root, ".qfai", "assistant", "manifest", "agent-catalog.yml"),
        "utf-8",
      );
      expect(newManifest).toContain("agents: []");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): upgrade on already-upgraded project is a no-op note
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree on an already-upgraded project emits W-USER-EDIT-PRESERVED only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023b-"));
    try {
      // First, perform a migration so the new tree exists with content
      // already in the 4 layers.
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "test-layers.md"), "legacy A\n", "utf-8");
      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });
      // Second --upgrade run: catalog/test-layers.md already exists; the
      // helper must emit the W-USER-EDIT-PRESERVED note and NOT overwrite.
      const stdout = await captureStdout(async () => {
        await runInit({
          dir: root,
          force: false,
          dryRun: false,
          yes: true,
          upgradeAssistantTree: true,
        });
      });
      expect(stdout).toContain("W-USER-EDIT-PRESERVED");
      // Existing file is preserved (not overwritten).
      const preserved = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "test-layers.md"),
        "utf-8",
      );
      expect(preserved).toContain("legacy A");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0024 (TDD-0024): migration memo authoring
  it("TC-0003-0024 (TDD-0024): --upgrade-assistant-tree writes a migration memo and is idempotent on re-run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0024-"));
    try {
      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });
      const memoMatches = await fg(
        ".qfai/assistant/process/migrations/v*-assistant-layer-recut.md",
        {
          cwd: root,
          dot: true,
        },
      );
      expect(memoMatches.length).toBe(1);
      const memoPath = path.join(root, memoMatches[0] ?? "");
      const firstBody = await readFile(memoPath, "utf-8");
      expect(firstBody).toContain("assistant-layer recut");
      expect(firstBody).toContain("sunset: v1.10.0");

      // Re-run: memo MUST NOT be modified (commit-immutable per OC-53).
      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });
      const secondBody = await readFile(memoPath, "utf-8");
      expect(secondBody).toBe(firstBody);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0003:TC-0003-0025 (TDD-0025): assistantPaths.ts SSOT — init.ts routes new layers through the helper
  it("TC-0003-0025 (TDD-0025): init.ts builds new 4-layer paths through assistantPaths.ts helpers", async () => {
    const initSrc = await readFile(
      path.join(__dirname, "..", "..", "src", "cli", "commands", "init.ts"),
      "utf-8",
    );
    expect(initSrc).toMatch(/from "\.\.\/\.\.\/core\/paths\/assistantPaths\.js"/);
    expect(initSrc).toContain("joinAssistantLayer");
    expect(initSrc).toContain("joinProjectSteering");
    expect(initSrc).toContain("joinMigrationMemo");
    // Layer path strings in path-construction position (e.g. path.join with
    // literal "constitution"/"manifest"/"catalog"/"process") should not
    // appear inside init.ts — those go through the SSOT instead.
    expect(initSrc).not.toMatch(
      /path\.join\([^)]*"\.qfai",\s*"assistant",\s*"(constitution|manifest|catalog|process)"/,
    );
  });

  // QFAI:SPEC-0003:TC-0003-0026 (TDD-0026): legacy backward-compat + sunset warning
  it("TC-0003-0026 (TDD-0026): qfai init (no flag) on a project with legacy steering/ retains it and prints D-DEPRECATED-PATH with sunset: v1.10.0", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0026-"));
    try {
      // Pre-seed legacy layout
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "test-layers.md"), "legacy content\n", "utf-8");

      const stdout = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      // Legacy directory is retained (NOT deleted).
      const legacyAfter = await readFile(path.join(legacy, "test-layers.md"), "utf-8");
      expect(legacyAfter).toBe("legacy content\n");
      // Warning is emitted with the literal sunset version.
      expect(stdout).toMatch(/D-DEPRECATED-PATH/);
      expect(stdout).toMatch(/sunset: v1\.10\.0/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
