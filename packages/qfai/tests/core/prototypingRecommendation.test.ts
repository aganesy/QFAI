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

  // W1: prototyping.yaml is now required when pack exists
  it("reports missing prototyping.yaml when discussion pack exists", async () => {
    await withRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260404000000000"), {
        recursive: true,
      });
      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-PROT-153")).toBe(true);
      expect(issues.some((i) => i.message.includes("prototyping.yaml"))).toBe(true);
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
          "surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-PROT-154")).toBe(true);
    });
  });

  it("reports missing allowed_modes with QFAI-PROT-155", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: missing allowed_modes",
          "  surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-155")).toBe(true);
    });
  });

  it("reports missing surface with QFAI-PROT-156", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: missing surface",
          "  allowed_modes:",
          "    - standard",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-156")).toBe(true);
    });
  });

  it("validates namespaced canonical schema without warnings", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: UI validation needed",
          "  allowed_modes:",
          "    - low-cost",
          "    - standard",
          "  surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(issues.some((i) => i.code === "QFAI-PROT-231")).toBe(false);
    });
  });

  it("reports deprecated top-level schema with warning only when all 4 fields present", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: standard",
          "rationale: top-level legacy",
          "allowed_modes:",
          "  - low-cost",
          "  - standard",
          "surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-231")).toBe(true);
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    });
  });

  it("reports conflicting schemas with warning", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: low-cost",
          "rationale: top-level",
          "allowed_modes:",
          "  - low-cost",
          "surface: web-ui",
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: namespaced",
          "  allowed_modes:",
          "    - standard",
          "  surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-232")).toBe(true);
    });
  });

  it("incomplete artifact fails validator and parser returns null recommendation", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: incomplete - missing allowed_modes and surface",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      const errorCodes = issues.filter((i) => i.severity === "error").map((i) => i.code);
      expect(errorCodes).toContain("QFAI-PROT-155");
      expect(errorCodes).toContain("QFAI-PROT-156");
    });
  });

  // W1: additional cases for missing/invalid YAML
  it("reports YAML parse error in prototyping.yaml", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        "{{invalid yaml:\n  - [broken",
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("reports invalid schema when prototyping.yaml has wrong types", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: 42",
          "  rationale: wrong types",
          "  allowed_modes: not-an-array",
          "  surface: invalid-surface",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
    });
  });

  // W2: existence-based precedence — key existence, not validness
  it("reports QFAI-PROT-232 when valid namespaced coexists with invalid legacy keys", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "# invalid legacy at top level",
          "recommended_mode: invalid-mode",
          "rationale: stale legacy block",
          "allowed_modes:",
          "  - standard",
          "surface: web-ui",
          "# valid namespaced block",
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: canonical block",
          "  allowed_modes:",
          "    - standard",
          "  surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-232")).toBe(true);
      // namespaced is primary — no error from namespaced path
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    });
  });

  it("namespaced missing + legacy with invalid recommended_mode → error", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: not-a-valid-mode",
          "rationale: legacy only with bad mode",
          "allowed_modes:",
          "  - standard",
          "surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
      expect(issues.some((i) => i.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("malformed namespaced + valid legacy does not silently fall back to legacy", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "# valid legacy at top level",
          "recommended_mode: standard",
          "rationale: top-level rationale",
          "allowed_modes:",
          "  - standard",
          "surface: web-ui",
          "# malformed namespaced block",
          "prototyping:",
          "  recommended_mode: invalid-mode",
          "  rationale: ''",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      // Should detect namespaced block as invalid, not silently pass with legacy
      expect(issues.some((i) => i.code === "QFAI-PROT-232")).toBe(true);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
    });
  });
});
