import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, loadConfig } from "../../src/core/config.js";

describe("config compatibility (promptsDir -> skillsDir)", () => {
  it("falls back skillsDir to promptsDir when skillsDir is omitted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-compat-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["paths:", "  promptsDir: .qfai/assistant/legacy-prompts", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.paths.promptsDir).toBe(".qfai/assistant/legacy-prompts");
      expect(config.paths.skillsDir).toBe(".qfai/assistant/legacy-prompts");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("prefers skillsDir when both skillsDir and promptsDir are configured", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-compat-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        [
          "paths:",
          "  skillsDir: .qfai/assistant/skills-next",
          "  promptsDir: .qfai/assistant/legacy-prompts",
          "",
        ].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.paths.skillsDir).toBe(".qfai/assistant/skills-next");
      expect(config.paths.promptsDir).toBe(".qfai/assistant/legacy-prompts");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not use promptsDir fallback when promptsDir is invalid", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-compat-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["paths:", "  promptsDir: 123", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(config.paths.skillsDir).toBe(defaultConfig.paths.skillsDir);
      expect(config.paths.promptsDir).toBe(defaultConfig.paths.promptsDir);
      expect(
        issues.some((issue) =>
          issue.message.includes("paths.promptsDir は文字列である必要があります。"),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
