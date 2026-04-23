import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { validateProject } from "../../src/core/validate.js";

describe("discussion design hardening integration smoke", { timeout: 30000 }, () => {
  it("init 後の discussion skill / template が exploration-first wording を持つ", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ddh-smoke-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const skill = await readFile(
        path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md"),
        "utf-8",
      );
      const reviewTemplate = await readFile(
        path.join(
          root,
          ".qfai",
          "assistant",
          "skills",
          "qfai-discussion",
          "templates",
          "14_Review-Request.md",
        ),
        "utf-8",
      );

      expect(skill).toMatch(/30_exploration_brief\.md/);
      expect(skill).toMatch(/34_evaluator_calibration\.md/);
      expect(reviewTemplate).toMatch(
        /30_exploration_brief\.md|best-of-history|Exploration Direction Consistency/i,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fresh init workspace で validate が exploration-first assets を読める", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ddh-validate-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const result = await validateProject(root);
      expect(Array.isArray(result.issues)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
