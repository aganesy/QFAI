import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";

describe("baseBranch config", () => {
  it("loads baseBranch from config YAML", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-basebranch-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "baseBranch: origin/develop\n", "utf-8");

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.baseBranch).toBe("origin/develop");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("defaults to undefined when baseBranch absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-basebranch-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "{}\n", "utf-8");

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.baseBranch).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports issue for non-string baseBranch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-basebranch-"));
    try {
      await writeFile(path.join(root, "qfai.config.yaml"), "baseBranch: 123\n", "utf-8");

      const { config, issues } = await loadConfig(root);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("QFAI_CONFIG_INVALID");
      expect(issues[0]?.message).toContain("baseBranch");
      expect(config.baseBranch).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("prototyping calibration config", () => {
  it("loads prototyping.calibration from config YAML", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        [
          "prototyping:",
          "  calibration:",
          "    packPath: .qfai/evidence/custom-calibration.yaml",
          "    thresholds:",
          "      accept: 0.9",
          "      refine: 0.4",
          "    maxIterations: 7",
          "    plateauDelta: 0.01",
          "    plateauLookback: 2",
          "",
        ].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues).toEqual([]);
      expect(config.prototyping?.calibration).toEqual({
        packPath: ".qfai/evidence/custom-calibration.yaml",
        thresholds: { accept: 0.9, refine: 0.4 },
        maxIterations: 7,
        plateauDelta: 0.01,
        plateauLookback: 2,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports issue for invalid threshold", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  calibration:", "    thresholds:", "      accept: 1.5", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues.some((issue) => issue.message.includes("thresholds.accept"))).toBe(true);
      expect(config.prototyping?.calibration?.thresholds?.accept).toBe(0.8);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports issue for invalid maxIterations", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-config-prototyping-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        ["prototyping:", "  calibration:", "    maxIterations: 0", ""].join("\n"),
        "utf-8",
      );

      const { config, issues } = await loadConfig(root);
      expect(issues.some((issue) => issue.message.includes("maxIterations"))).toBe(true);
      expect(config.prototyping?.calibration?.maxIterations).toBe(15);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
