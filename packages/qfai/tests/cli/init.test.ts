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
        path.join(root, ".qfai", "rules", "pnpm.md"),
        path.join(root, ".qfai", "prompts", "require-to-spec.md"),
        path.join(root, ".qfai", "prompts", "qfai-generate-test-globs.md"),
        path.join(root, ".qfai", "require", "README.md"),
        path.join(root, ".qfai", "promptpack", "constitution.md"),
        path.join(root, "tests", "qfai-traceability.sample.test.ts"),
      ];

      for (const filePath of expectedFiles) {
        await access(filePath);
      }
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

      const existingRule = path.join(root, ".qfai", "rules", "pnpm.md");
      await mkdir(path.dirname(existingRule), { recursive: true });
      await writeFile(existingRule, "custom rule\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const ruleAfter = await readFile(existingRule, "utf-8");
      expect(ruleAfter).toBe("custom rule\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("overwrites prompts only when --force is provided", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const promptsReadme = path.join(root, ".qfai", "prompts", "README.md");
      await writeFile(promptsReadme, "custom prompts\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const afterNoForce = await readFile(promptsReadme, "utf-8");
      expect(afterNoForce).toBe("custom prompts\n");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      const afterForce = await readFile(promptsReadme, "utf-8");

      const template = await readFile(
        path.join(getInitAssetsDir(), ".qfai", "prompts", "README.md"),
        "utf-8",
      );

      expect(afterForce).toBe(template);
      expect(afterForce).not.toBe("custom prompts\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
