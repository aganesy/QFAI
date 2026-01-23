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

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { runInit } from "../../src/cli/commands/init.js";
import { copyTemplateTree } from "../../src/cli/lib/fs.js";

describe("copyTemplateTree", () => {
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
        path.join(root, ".qfai", "assistant", "prompts", "qfai-configure.md"),
        path.join(root, ".qfai", "assistant", "prompts", "qfai-require.md"),
        path.join(root, ".github", "prompts", "qfai-configure.prompt.md"),
        path.join(root, ".claude", "commands", "qfai-configure.md"),
        path.join(root, ".codex", "skills", "qfai-configure", "SKILL.md"),
        path.join(
          root,
          ".qfai",
          "assistant",
          "instructions",
          "constitution.md",
        ),
        path.join(root, ".qfai", "assistant", "agents", "facilitator.md"),
        path.join(root, ".qfai", "require", "README.md"),
      ];

      for (const filePath of expectedFiles) {
        await access(filePath);
      }

      const reportDir = path.join(root, ".qfai", "report");
      let reportError: NodeJS.ErrnoException | undefined;
      try {
        await access(reportDir);
      } catch (error) {
        reportError = error as NodeJS.ErrnoException;
      }
      expect(reportError?.code).toBe("ENOENT");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not overwrite prompts.local even with --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const localReadme = path.join(
        root,
        ".qfai",
        "assistant",
        "prompts.local",
        "README.md",
      );
      const customized = "customized prompts.local\n";
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

  it("overwrites prompts only when --force is provided", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const promptSample = path.join(
        root,
        ".qfai",
        "assistant",
        "prompts",
        "qfai-require.md",
      );
      await writeFile(promptSample, "custom prompts\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const afterNoForce = await readFile(promptSample, "utf-8");
      expect(afterNoForce).toBe("custom prompts\n");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      const afterForce = await readFile(promptSample, "utf-8");

      const template = await readFile(
        path.join(
          getInitAssetsDir(),
          ".qfai",
          "assistant",
          "prompts",
          "qfai-require.md",
        ),
        "utf-8",
      );

      expect(afterForce).toBe(template);
      expect(afterForce).not.toBe("custom prompts\n");
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
        "spec.md",
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
