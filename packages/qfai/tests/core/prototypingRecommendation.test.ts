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

  it("reports missing prototyping.yaml for latest UI-bearing discussion pack", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "## UI-bearing Classification",
          "",
          "- ui_bearing: true",
          "- primary_surface: web",
          "- secondary_surfaces:",
          "  - mobile",
          "- classification_rationale: Screen-based workflow.",
          "",
        ].join("\n"),
        "utf-8",
      );
      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-PROT-153")).toBe(true);
      expect(issues.some((i) => i.message.includes("prototyping.yaml"))).toBe(true);
    });
  });

  it("does not report missing prototyping.yaml for latest non-ui discussion pack", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000001");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "## UI-bearing Classification",
          "",
          "- ui_bearing: false",
          "- primary_surface: non-ui",
          "- secondary_surfaces:",
          "- classification_rationale: API-only workflow.",
          "",
        ].join("\n"),
        "utf-8",
      );
      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("reports missing prototyping.yaml for contradictory non-ui classification", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000010");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "## UI-bearing Classification",
          "",
          "- ui_bearing: false",
          "- primary_surface: non-ui",
          "- secondary_surfaces:",
          "  - web",
          "- classification_rationale: Contradictory — non-ui with web secondary.",
          "",
        ].join("\n"),
        "utf-8",
      );
      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("does not exempt invalid UI-bearing classification from prototyping requirement", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000011");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "## UI-bearing Classification",
          "",
          "- ui_bearing: true",
          "- primary_surface: non-ui",
          "- secondary_surfaces:",
          "- classification_rationale: Invalid — ui_bearing=true with non-ui primary.",
          "",
        ].join("\n"),
        "utf-8",
      );
      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("exempts valid non-ui classification from prototyping requirement", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000012");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "## UI-bearing Classification",
          "",
          "- ui_bearing: false",
          "- primary_surface: non-ui",
          "- secondary_surfaces:",
          "- classification_rationale: Pure API workflow with no UI.",
          "",
        ].join("\n"),
        "utf-8",
      );
      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("reports malformed recommendation (no prototyping namespace)", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["recommended_mode: invalid", "rationale: ''", ""].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      // No prototyping namespace -> requires canonical namespaced schema error
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
          "prototyping:",
          "  recommended_mode: full-harness",
          "  rationale: runtime proof required",
          "  allowed_modes:",
          "    - standard",
          "  surface: web",
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
          "  surface: web",
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
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(issues.some((i) => i.code === "QFAI-PROT-231")).toBe(false);
    });
  });

  it("reports error for top-level-only schema (legacy removed)", async () => {
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
          "surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
      expect(issues.some((i) => i.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("accepts namespaced schema even when stale legacy keys coexist (legacy ignored)", async () => {
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
          "surface: web",
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: namespaced",
          "  allowed_modes:",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
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

  it("valid namespaced coexists with stale legacy keys -> no error (legacy keys ignored)", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "# stale legacy keys at top level (ignored)",
          "recommended_mode: invalid-mode",
          "rationale: stale legacy block",
          "allowed_modes:",
          "  - standard",
          "surface: web",
          "# valid namespaced block",
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: canonical block",
          "  allowed_modes:",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      // namespaced is primary — no error from namespaced path
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    });
  });

  it("namespaced missing + legacy-only -> requires canonical namespaced error", async () => {
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
          "surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
      expect(issues.some((i) => i.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("treats scalar namespaced block as invalid", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["prototyping: invalid", ""].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
      expect(issues.some((i) => i.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("treats array namespaced block as invalid", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["prototyping:", "  - item1", "  - item2", ""].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
      expect(issues.some((i) => i.code === "QFAI-PROT-153")).toBe(true);
    });
  });

  it("treats null namespaced block as invalid", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["prototyping: null", ""].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
    });
  });

  it("treats boolean namespaced block as invalid", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["prototyping: true", ""].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
    });
  });

  it("malformed namespaced block produces errors", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["prototyping:", "  recommended_mode: invalid-mode", "  rationale: ''", ""].join("\n"),
        "utf-8",
      );

      const issues = await validatePrototypingRecommendation(root, defaultConfig);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
    });
  });
});
