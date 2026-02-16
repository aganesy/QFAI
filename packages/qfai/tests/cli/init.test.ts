import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { runInit } from "../../src/cli/commands/init.js";
import { copyTemplateTree } from "../../src/cli/lib/fs.js";
import { captureStdout } from "../helpers/stdout.js";

// This suite exercises end-to-end init flows with extensive filesystem I/O
// (temp dirs, template copying, globbing), so we use a higher timeout to
// avoid flaky failures on slow or heavily loaded CI runners.
describe("copyTemplateTree", { timeout: 60000 }, () => {
  it("fails with guidance when conflicts exist and --force is missing", async () => {
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-src-"));
    const destRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-dest-"));
    try {
      await mkdir(path.join(sourceRoot, "nested"), { recursive: true });
      await writeFile(
        path.join(sourceRoot, "nested", "template.txt"),
        "sample",
      );

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

  it("creates template additions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const expectedFiles = [
        path.join(
          root,
          ".qfai",
          "assistant",
          "skills",
          "qfai-configure",
          "SKILL.md",
        ),
        path.join(
          root,
          ".qfai",
          "assistant",
          "skills",
          "qfai-require",
          "SKILL.md",
        ),
        path.join(
          root,
          ".qfai",
          "assistant",
          "instructions",
          "constitution.md",
        ),
        path.join(root, ".qfai", "assistant", "agents", "facilitator.md"),
        path.join(
          root,
          ".qfai",
          "assistant",
          "steering",
          "review-gate.rules.yml",
        ),
        path.join(root, ".qfai", "require", "README.md"),
        path.join(root, ".qfai", "status", "README.md"),
        path.join(root, ".qfai", "review", "README.md"),
        path.join(root, ".claude", "commands", "qfai-configure.md"),
        path.join(root, ".claude", "agents", "facilitator.md"),
        path.join(root, ".claude", "agents", "README.md"),
        path.join(root, ".github", "prompts", "qfai-configure.prompt.md"),
        path.join(root, ".github", "agents", "facilitator.agent.md"),
        path.join(root, ".github", "agents", "README.md"),
        path.join(root, ".github", "copilot-instructions.md"),
        path.join(root, ".codex", "skills", "qfai-configure", "SKILL.md"),
        path.join(root, ".codex", "README.md"),
      ];

      for (const filePath of expectedFiles) {
        await access(filePath);
      }

      await expect(
        access(path.join(root, ".qfai", "assistant", "prompts")),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await expect(
        access(path.join(root, ".claude", "commands", "qfai-spec.md")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".github", "prompts", "qfai-spec.prompt.md")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".codex", "skills", "qfai-spec", "SKILL.md")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });

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
          ".qfai/discuss/**/*",
          ".qfai/require/**/*",
          ".qfai/status/**/*",
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
        return fileName !== "README.md" && fileName !== ".gitignore";
      });
      expect(unexpected).toEqual([]);

      await expect(
        access(path.join(root, ".qfai", "discussions")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not overwrite skills.local even with --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const localReadme = path.join(
        root,
        ".qfai",
        "assistant",
        "skills.local",
        "README.md",
      );
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

      const existingRequire = path.join(root, ".qfai", "require", "README.md");
      await writeFile(existingRequire, "custom require\n", "utf-8");

      const existingConstitution = path.join(
        root,
        ".qfai",
        "assistant",
        "instructions",
        "constitution.md",
      );
      await writeFile(existingConstitution, "custom constitution\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const requireAfter = await readFile(existingRequire, "utf-8");
      expect(requireAfter).toBe("custom require\n");

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
        "qfai-require",
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
          "qfai-require",
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

  it("overwrites wrappers only when --force is provided", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const wrapperPath = path.join(
        root,
        ".claude",
        "commands",
        "qfai-require.md",
      );
      await writeFile(wrapperPath, "custom wrapper\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const afterNoForce = await readFile(wrapperPath, "utf-8");
      expect(afterNoForce).toBe("custom wrapper\n");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      const afterForce = await readFile(wrapperPath, "utf-8");
      expect(afterForce).not.toBe("custom wrapper\n");
      expect(afterForce).toContain(
        "@.qfai/assistant/skills/qfai-require/SKILL.md",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes deprecated wrappers on --force resync", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const deprecatedClaude = path.join(
        root,
        ".claude",
        "commands",
        "qfai-spec.md",
      );
      const deprecatedGithub = path.join(
        root,
        ".github",
        "prompts",
        "qfai-spec.prompt.md",
      );
      const deprecatedCodex = path.join(
        root,
        ".codex",
        "skills",
        "qfai-spec",
        "SKILL.md",
      );

      await mkdir(path.dirname(deprecatedClaude), { recursive: true });
      await mkdir(path.dirname(deprecatedGithub), { recursive: true });
      await mkdir(path.dirname(deprecatedCodex), { recursive: true });
      await writeFile(deprecatedClaude, "legacy wrapper\n", "utf-8");
      await writeFile(deprecatedGithub, "legacy wrapper\n", "utf-8");
      await writeFile(deprecatedCodex, "legacy wrapper\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(access(deprecatedClaude)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(access(deprecatedGithub)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(access(deprecatedCodex)).rejects.toMatchObject({
        code: "ENOENT",
      });
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
        "qfai-require",
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

  it("does not remove custom codex 10_workflow.md on --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const customCodexLegacy = path.join(
        root,
        ".codex",
        "skills",
        "custom-skill",
        "10_workflow.md",
      );
      await mkdir(path.dirname(customCodexLegacy), { recursive: true });
      await writeFile(customCodexLegacy, "custom codex workflow\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(access(customCodexLegacy)).resolves.toBeUndefined();
      const after = await readFile(customCodexLegacy, "utf-8");
      expect(after).toBe("custom codex workflow\n");
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
        "qfai-require",
        "10_workflow.md",
      );
      await writeFile(legacyPath, "legacy workflow\n", "utf-8");

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: true, yes: true });
      });

      expect(output).toContain("would remove legacy files: 1");
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

      const specPath = path.join(
        root,
        ".qfai",
        "specs",
        "spec-0001",
        "01_Spec.md",
      );
      const uiContractPath = path.join(
        root,
        ".qfai",
        "contracts",
        "ui",
        "ui-0001-sample.yaml",
      );

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
});
