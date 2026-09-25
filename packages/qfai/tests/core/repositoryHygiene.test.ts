import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateRepositoryHygiene } from "../../src/core/validators/repositoryHygiene.js";

describe("validateRepositoryHygiene", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-hygiene-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("fails for legacy directory aliases", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "discussions"), {
        recursive: true,
      });
      await mkdir(path.join(root, ".qfai", "requirements"), {
        recursive: true,
      });
      await mkdir(path.join(root, ".qfai", "specs"), {
        recursive: true,
      });

      const issues = await validateRepositoryHygiene(root, defaultConfig);
      const legacyIssues = issues.filter((entry) => entry.code === "QFAI-HYG-001");
      expect(legacyIssues).toHaveLength(3);
      expect(legacyIssues.every((entry) => entry.severity === "error")).toBe(true);
      expect(
        legacyIssues.find((entry) => entry.file?.endsWith("specs"))?.suggested_action,
      ).toContain(".qfai/spec/");
    });
  });

  it("accepts the current .qfai/spec story-tree root", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "spec", "02_business-flow"), { recursive: true });

      const issues = await validateRepositoryHygiene(root, defaultConfig);

      expect(issues.filter((entry) => entry.code === "QFAI-HYG-001")).toEqual([]);
    });
  });

  it("accepts an explicitly configured story-tree root with a former default name", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "specs", "02_business-flow"), { recursive: true });
      const config = {
        ...defaultConfig,
        paths: { ...defaultConfig.paths, specsDir: ".qfai/specs" },
      };

      const issues = await validateRepositoryHygiene(root, config);

      expect(issues.filter((entry) => entry.code === "QFAI-HYG-001")).toEqual([]);
    });
  });

  it("warns when template-like artifacts are found under specs", async () => {
    await withTempRoot(async (root) => {
      const templateDir = path.join(root, ".qfai", "spec", "_template");
      await mkdir(templateDir, { recursive: true });
      await writeFile(path.join(templateDir, "sample.md"), "# sample\n");

      const issues = await validateRepositoryHygiene(root, defaultConfig);
      const templateIssue = issues.find((entry) => entry.code === "QFAI-HYG-002");
      expect(templateIssue?.severity).toBe("warning");
      expect(templateIssue?.refs).toContain("_template");
      expect(templateIssue?.refs).toContain("_template/sample.md");
    });
  });

  it("scans template contamination using configured specsDir", async () => {
    await withTempRoot(async (root) => {
      const config = {
        ...defaultConfig,
        paths: {
          ...defaultConfig.paths,
          specsDir: ".qfai/specs-custom",
        },
      };
      const defaultTemplateDir = path.join(root, ".qfai", "spec", "_template");
      const customSamplesDir = path.join(root, ".qfai", "specs-custom", "samples");
      await mkdir(defaultTemplateDir, { recursive: true });
      await mkdir(customSamplesDir, { recursive: true });
      await writeFile(path.join(defaultTemplateDir, "sample.md"), "# sample\n");
      await writeFile(path.join(customSamplesDir, "sample.md"), "# sample\n");

      const issues = await validateRepositoryHygiene(root, config);
      const templateIssue = issues.find((entry) => entry.code === "QFAI-HYG-002");
      expect(templateIssue?.severity).toBe("warning");
      expect(templateIssue?.refs).toContain("samples");
      expect(templateIssue?.refs).toContain("samples/sample.md");
      expect(templateIssue?.refs).not.toContain("_template");
      expect(templateIssue?.refs).not.toContain("_template/sample.md");
    });
  });
});
