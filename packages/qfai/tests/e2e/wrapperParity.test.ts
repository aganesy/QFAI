import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const templateQfaiDir = path.join(templateRoot, ".qfai");
const implementSkillPath = path.join(
  templateQfaiDir,
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

// QFAI:SPEC-0011:US-0011-0005
describe("wrapper parity across all three platforms", { timeout: 15000 }, () => {
  it("all platform wrappers point to canonical qfai-implement via symlinks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-wrapper-parity-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const canonicalSkill = path.join(root, ".qfai", "assistant", "skills", "qfai-implement");

      for (const integration of [".claude", ".agents", ".codex"]) {
        const wrapperSkill = path.join(root, integration, "skills", "qfai-implement");
        const stat = await lstat(wrapperSkill);
        expect(stat.isSymbolicLink(), `${integration} wrapper must be a symlink`).toBe(true);
        expect(await realpath(wrapperSkill)).toBe(await realpath(canonicalSkill));

        // SKILL.md is accessible through the symlink
        const skillContent = await readFile(path.join(wrapperSkill, "SKILL.md"), "utf-8");
        expect(skillContent.length).toBeGreaterThan(0);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("all three platform wrappers serve identical SKILL.md content (parity drift = 0)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-wrapper-parity-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const contents: string[] = [];
      for (const integration of [".claude", ".agents", ".codex"]) {
        const wrapperSkill = path.join(root, integration, "skills", "qfai-implement", "SKILL.md");
        contents.push(await readFile(wrapperSkill, "utf-8"));
      }

      // All three must be identical (since they're symlinks to the same canonical)
      expect(contents[0]).toBe(contents[1]);
      expect(contents[1]).toBe(contents[2]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("all platform wrapper SKILL.md contains required phrases and no forbidden phrases", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-wrapper-parity-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const requiredPhrases = [
        "watch it fail",
        "watch it pass",
        "fresh evidence",
        "spec review",
        "code quality review",
        "one test at a time",
        "parallel",
        "independent",
      ];
      const forbiddenPhrases = [
        "qfai-tdd-red",
        "qfai-tdd-green",
        "qfai-tdd-refactor",
        "write all tests first",
        "implement later",
        "80% coverage required",
        "minimum N tests",
      ];

      for (const integration of [".claude", ".agents", ".codex"]) {
        const wrapperSkill = path.join(root, integration, "skills", "qfai-implement", "SKILL.md");
        const content = await readFile(wrapperSkill, "utf-8");
        const lower = content.toLowerCase();

        for (const phrase of requiredPhrases) {
          expect(lower, `Required phrase "${phrase}" missing in ${integration} wrapper`).toContain(
            phrase.toLowerCase(),
          );
        }

        for (const phrase of forbiddenPhrases) {
          expect(
            lower,
            `Forbidden phrase "${phrase}" found in ${integration} wrapper`,
          ).not.toContain(phrase.toLowerCase());
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// QFAI:SPEC-0011:US-0011-0005
describe("wrapper behavior-only language", () => {
  it("SKILL.md description frontmatter uses behavior-only language without sub-agent names", async () => {
    const content = await readFile(implementSkillPath, "utf-8");

    // Extract the frontmatter description
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(frontmatterMatch).not.toBeNull();

    const frontmatter = frontmatterMatch?.[1] ?? "";
    expect(frontmatter.length).toBeGreaterThan(0);

    const descriptionMatch = frontmatter.match(/description:\s*"([^"]+)"/);
    expect(descriptionMatch).not.toBeNull();

    const description = descriptionMatch?.[1] ?? "";
    expect(description.length).toBeGreaterThan(0);

    // Description must NOT expose sub-agent names
    const subAgentNames = [
      "TDDCycleController",
      "TDDImplementer",
      "RedGreenAuditor",
      "TDDSpecReviewer",
      "TDDCodeQualityReviewer",
      "ParallelSliceDispatcher",
    ];

    for (const name of subAgentNames) {
      expect(
        description,
        `Sub-agent name "${name}" must not appear in wrapper description`,
      ).not.toContain(name);
    }
  });
});
