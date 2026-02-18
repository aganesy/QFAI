import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

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

  it("warns for legacy directory aliases", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "discussions"), {
        recursive: true,
      });
      await mkdir(path.join(root, ".qfai", "requirements"), {
        recursive: true,
      });

      const issues = await validateRepositoryHygiene(root);
      const legacyIssues = issues.filter(
        (entry) => entry.code === "QFAI-HYG-001",
      );
      expect(legacyIssues).toHaveLength(2);
      expect(legacyIssues.every((entry) => entry.severity === "warning")).toBe(
        true,
      );
    });
  });

  it("warns when template-like artifacts are found under specs", async () => {
    await withTempRoot(async (root) => {
      const templateDir = path.join(root, ".qfai", "specs", "_template");
      await mkdir(templateDir, { recursive: true });
      await writeFile(path.join(templateDir, "sample.md"), "# sample\n");

      const issues = await validateRepositoryHygiene(root);
      const templateIssue = issues.find(
        (entry) => entry.code === "QFAI-HYG-002",
      );
      expect(templateIssue?.severity).toBe("warning");
      expect(templateIssue?.refs).toContain("_template");
      expect(templateIssue?.refs).toContain("_template/sample.md");
    });
  });
});
