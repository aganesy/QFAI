import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { resolveLatestRecommendationArtifact } from "../../src/core/prototyping/recommendationArtifact.js";

describe("resolveLatestRecommendationArtifact", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-rec-artifact-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("returns no-pack when no discussion pack exists", async () => {
    await withTempRoot(async (root) => {
      // no discussion dir at all
      const result = await resolveLatestRecommendationArtifact(root, defaultConfig);
      expect(result.status).toBe("no-pack");
      expect(result.recommendation).toBeNull();
      expect(result.path).toBeUndefined();
    });
  });

  it("returns missing when discussion pack exists but prototyping.yaml is absent", async () => {
    await withTempRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });

      const result = await resolveLatestRecommendationArtifact(root, defaultConfig);
      expect(result.status).toBe("missing");
      expect(result.recommendation).toBeNull();
      expect(result.path).toContain("prototyping.yaml");
    });
  });

  it("returns invalid when prototyping.yaml exists but has invalid schema", async () => {
    await withTempRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        "prototyping:\n  recommended_mode: bogus\n",
        "utf-8",
      );

      const result = await resolveLatestRecommendationArtifact(root, defaultConfig);
      expect(result.status).toBe("invalid");
      expect(result.recommendation).toBeNull();
      expect(result.path).toContain("prototyping.yaml");
    });
  });

  it("returns invalid when namespaced block is non-object", async () => {
    await withTempRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        "prototyping: scalar-value\n",
        "utf-8",
      );

      const result = await resolveLatestRecommendationArtifact(root, defaultConfig);
      expect(result.status).toBe("invalid");
      expect(result.recommendation).toBeNull();
    });
  });

  it("returns valid with recommendation when prototyping.yaml is correct", async () => {
    await withTempRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: validated recommendation",
          "  allowed_modes:",
          "    - standard",
          "    - low-cost",
          "  surface: non-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await resolveLatestRecommendationArtifact(root, defaultConfig);
      expect(result.status).toBe("valid");
      expect(result.recommendation).not.toBeNull();
      if (!result.recommendation) throw new Error("recommendation should not be null");
      expect(result.recommendation.recommendedMode).toBe("standard");
      expect(result.recommendation.surface).toBe("non-ui");
      expect(result.recommendation.allowedModes).toEqual(["low-cost", "standard"]);
      expect(result.path).toContain("prototyping.yaml");
    });
  });

  it("returns invalid for legacy-only schema (no prototyping namespace)", async () => {
    await withTempRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: standard",
          "rationale: legacy format",
          "allowed_modes:",
          "  - standard",
          "surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await resolveLatestRecommendationArtifact(root, defaultConfig);
      expect(result.status).toBe("invalid");
      expect(result.recommendation).toBeNull();
    });
  });
});
