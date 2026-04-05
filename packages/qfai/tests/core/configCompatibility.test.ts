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

  it("normalizes uiux.renderEvidence defaults and preserves explicit settings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-render-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        [
          "uiux:",
          "  renderEvidence:",
          "    enabled: true",
          "    viewports: [desktop, mobile, desktop]",
          "    out: .qfai/evidence/custom-render.json",
          "    baseUrl: http://localhost:3000",
          "    failOpen: true",
          "",
        ].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.uiux?.renderEvidence).toEqual({
        enabled: true,
        viewports: ["desktop", "mobile"],
        out: ".qfai/evidence/custom-render.json",
        baseUrl: "http://localhost:3000",
        failOpen: true,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps canonical defaults when prototyping block is absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-compat-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "{}\n", "utf-8");
      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.prototyping).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fills defaults for partial prototyping calibration config", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-compat-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  calibration:", "    maxIterations: 9", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.prototyping?.calibration).toEqual({
        packPath: ".qfai/evidence/calibration.yaml",
        thresholds: { accept: 0.8, refine: 0.5 },
        maxIterations: 9,
        plateauDelta: 0.02,
        plateauLookback: 3,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
