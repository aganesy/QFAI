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
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { runInit } from "../../src/cli/commands/init.js";
import { copyTemplateTree } from "../../src/cli/lib/fs.js";
import { captureStdout } from "../helpers/stdout.js";

const REQUIRED_SKILLS = [
  "qfai-configure",
  "qfai-discussion",
  "qfai-sdd",
  "qfai-atdd",
  "qfai-prototyping",
  "qfai-implement",
  "qfai-verify",
];

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
describe("copyTemplateTree", { timeout: 60000 }, () => {
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

  it("maps template .npmignore files to .gitignore in destination", async () => {
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-src-"));
    const destRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-dest-"));
    try {
      await mkdir(path.join(sourceRoot, "review"), { recursive: true });
      await writeFile(path.join(sourceRoot, "review", ".npmignore"), "node_modules/\n", "utf-8");

      await copyTemplateTree(sourceRoot, destRoot, {
        force: false,
        dryRun: false,
      });

      await expect(readFile(path.join(destRoot, "review", ".gitignore"), "utf-8")).resolves.toBe(
        "node_modules/\n",
      );
      await expect(access(path.join(destRoot, "review", ".npmignore"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(sourceRoot, { recursive: true, force: true });
      await rm(destRoot, { recursive: true, force: true });
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
        path.join(root, ".qfai", "assistant", "agents", "facilitator.md"),
        path.join(root, ".qfai", "assistant", "steering", "review-gate.rules.yml"),
        path.join(root, ".qfai", "assistant", "steering", "review-roster.yml"),
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
        path.join(root, ".qfai", "discussion", ".gitignore"),
        path.join(root, ".qfai", "discussion", "README.md"),
        path.join(root, ".qfai", "report", ".gitignore"),
        path.join(root, ".qfai", "review", ".gitignore"),
        path.join(root, ".qfai", "review", "README.md"),
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
      const claudeAgent = path.join(root, ".claude", "agents", "facilitator.md");
      await expectSymlink(claudeAgent);
      await expectSymlinkTarget(claudeAgent, ".qfai/assistant/agents/facilitator.md");

      const githubAgent = path.join(root, ".github", "agents", "facilitator.agent.md");
      await expectSymlink(githubAgent);
      await expectSymlinkTarget(githubAgent, ".qfai/assistant/agents/facilitator.md");

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

      const reportDir = path.join(root, ".qfai", "report");
      await access(reportDir);
      await access(path.join(reportDir, "README.md"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates empty init scaffold outside assistant assets", async () => {
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
      const unexpected = scaffoldFiles.filter((relativePath) => {
        const fileName = path.basename(relativePath);
        return fileName !== "README.md" && fileName !== ".gitignore" && fileName !== "test-list.md";
      });
      expect(unexpected).toEqual([]);

      await access(path.join(root, ".qfai", "specs", "_policies"));

      await expect(access(path.join(root, ".qfai", "discussions"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not overwrite skills.local even with --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const localReadme = path.join(root, ".qfai", "assistant", "skills.local", "README.md");
      const customized = "customized skills.local\n";
      await writeFile(localReadme, customized, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const after = await readFile(localReadme, "utf-8");
      expect(after).toBe(customized);
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

      const existingDiscussion = path.join(root, ".qfai", "discussion", "README.md");
      await writeFile(existingDiscussion, "custom discussion\n", "utf-8");

      const existingConstitution = path.join(
        root,
        ".qfai",
        "assistant",
        "instructions",
        "constitution.md",
      );
      await writeFile(existingConstitution, "custom constitution\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const discussionAfter = await readFile(existingDiscussion, "utf-8");
      expect(discussionAfter).toBe("custom discussion\n");

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

  // QFAI:SPEC-0017:TC-0017-0001
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

  // QFAI:SPEC-0017:TC-0017-0002
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

  // QFAI:SPEC-0017:TC-0017-0003
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

  // QFAI:SPEC-0017:TC-0017-0004
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

  // QFAI:SPEC-0017:TC-0017-0005
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

  // QFAI:SPEC-0017:TC-0017-0006
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

  // QFAI:SPEC-0017:TC-0017-0007
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

  // QFAI:SPEC-0017:TC-0017-0008
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

  // QFAI:SPEC-0017:TC-0017-0009
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

  // QFAI:SPEC-0017:TC-0017-0010
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

  // QFAI:SPEC-0017:TC-0017-0011
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

  // QFAI:SPEC-0017:TC-0017-0012
  it("Backward compatibility — existing init outputs unchanged", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // All previously expected files still exist (instructions files are additive only)
      const expectedRegularFiles = [
        path.join(root, ".qfai", "assistant", "skills", "qfai-configure", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "instructions", "constitution.md"),
        path.join(root, ".qfai", "assistant", "agents", "facilitator.md"),
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
});
