import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validatePrototypingRecommendation } from "../../src/core/validators/prototypingRecommendation.js";

describe("validatePrototypingRecommendation", () => {
  async function withRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-rec-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("returns no issue when prototyping.yaml is missing", async () => {
    await withRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260404000000000"), {
        recursive: true,
      });
      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("reports malformed recommendation", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["recommended_mode: invalid", "rationale: ''", ""].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("reports when allowed_modes does not include recommended_mode", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: full-harness",
          "rationale: runtime proof required",
          "allowed_modes:",
          "  - standard",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-PROT-154")).toBe(true);
    });
  });
});
