import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runPrototypingExecution } from "../../src/core/prototyping/execution.js";

async function withRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-run-"));
  try {
    await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  discussionDir: .qfai/discussion\n",
      "utf-8",
    );
    await writeFile(
      path.join(root, "01_Context.md"),
      [
        "# Context",
        "",
        "- ui_bearing: true",
        "- primary_surface: web",
        "- secondary_surfaces:",
        "  - cli",
        "- classification_rationale: default web execution fixture",
        "",
      ].join("\n"),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("runPrototypingExecution", () => {
  it("writes three evidence bundles for standard mode", async () => {
    await withRoot(async (root) => {
      const result = await runPrototypingExecution({ root, requestedMode: "standard" });

      expect(result.mode).toBe("standard");
      await expect(access(result.evidencePaths.prototyping)).resolves.toBeUndefined();
      await expect(access(result.evidencePaths.render)).resolves.toBeUndefined();
      await expect(access(result.evidencePaths.browserQa)).resolves.toBeUndefined();
    });
  });

  it("persists fullHarness block for full-harness mode", async () => {
    await withRoot(async (root) => {
      const result = await runPrototypingExecution({ root, requestedMode: "full-harness" });
      const payload = JSON.parse(await readFile(result.evidencePaths.prototyping, "utf-8")) as {
        fullHarness?: {
          terminationReason?: string;
          scoringTrace?: unknown[];
          reviewerSignoff?: { reviewer?: string };
        };
      };

      expect(payload.fullHarness?.terminationReason).toBeTruthy();
      expect(payload.fullHarness?.scoringTrace?.length).toBeGreaterThan(0);
      expect(payload.fullHarness?.reviewerSignoff?.reviewer).toBe("qfai");
    });
  });

  it("contradictory non-ui classification rejects execution", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-run-"));
    try {
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  discussionDir: .qfai/discussion\n",
        "utf-8",
      );
      await writeFile(
        path.join(root, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: false",
          "- primary_surface: non-ui",
          "- secondary_surfaces:",
          "  - web",
          "- classification_rationale: contradictory non-ui with web secondary",
          "",
        ].join("\n"),
        "utf-8",
      );

      // valid namespaced prototyping.yaml should not save execution from invalid classification
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: should not matter",
          "  allowed_modes:",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(runPrototypingExecution({ root })).rejects.toThrow(/invalid|contradictory/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("invalid ui-bearing classification rejects execution", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-run-"));
    try {
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  discussionDir: .qfai/discussion\n",
        "utf-8",
      );
      await writeFile(
        path.join(root, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: true",
          "- primary_surface: non-ui",
          "- secondary_surfaces:",
          "- classification_rationale: invalid ui-bearing with non-ui primary",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(runPrototypingExecution({ root })).rejects.toThrow(/invalid|contradictory/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("valid non-ui classification is not an execution target", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-run-"));
    try {
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  discussionDir: .qfai/discussion\n",
        "utf-8",
      );
      await writeFile(
        path.join(root, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: false",
          "- primary_surface: non-ui",
          "- secondary_surfaces:",
          "- classification_rationale: pure API workflow",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(runPrototypingExecution({ root })).rejects.toThrow(
        /not a prototyping execution target/i,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("valid ui-bearing classification proceeds", async () => {
    await withRoot(async (root) => {
      const result = await runPrototypingExecution({ root, requestedMode: "standard" });
      expect(result.mode).toBe("standard");
      expect(result.surface).toBe("web");
    });
  });

  it("rejects stale coexist artifact even with explicit mode", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: true",
          "- primary_surface: web",
          "- secondary_surfaces:",
          "  - cli",
          "- classification_rationale: stale coexist execution fixture",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: low-cost",
          "rationale: stale top-level",
          "allowed_modes:",
          "  - low-cost",
          "surface: web",
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: valid namespaced",
          "  allowed_modes:",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Stale coexist artifact must be hard rejected regardless of explicit mode
      await expect(runPrototypingExecution({ root, requestedMode: "standard" })).rejects.toThrow(
        /recommendation artifact is invalid/i,
      );
    });
  });

  it("rejects malformed namespaced artifact", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: true",
          "- primary_surface: web",
          "- secondary_surfaces:",
          "  - cli",
          "- classification_rationale: malformed namespaced execution fixture",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: invalid-mode-value",
          "  rationale: malformed",
          "  allowed_modes:",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(runPrototypingExecution({ root })).rejects.toThrow(
        /recommendation artifact is invalid/i,
      );
    });
  });

  it("accepts namespaced-only recommendation for execution", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: true",
          "- primary_surface: web",
          "- secondary_surfaces:",
          "  - cli",
          "- classification_rationale: namespaced-only execution fixture",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: low-cost",
          "  rationale: namespaced-only recommendation",
          "  allowed_modes:",
          "    - low-cost",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Without explicit mode, should adopt the namespaced recommendation
      const result = await runPrototypingExecution({ root });
      expect(result.mode).toBe("low-cost");
    });
  });

  it("accepts namespaced-only artifact with explicit mode override", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: true",
          "- primary_surface: web",
          "- secondary_surfaces:",
          "  - cli",
          "- classification_rationale: namespaced-only explicit mode fixture",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: low-cost",
          "  rationale: namespaced-only recommendation",
          "  allowed_modes:",
          "    - low-cost",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Explicit mode should override recommendation; valid artifact is accepted
      const result = await runPrototypingExecution({ root, requestedMode: "standard" });
      expect(result.mode).toBe("standard");
    });
  });

  it("rejects semantic mismatch artifact (recommended_mode not in allowed_modes)", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: true",
          "- primary_surface: web",
          "- secondary_surfaces:",
          "  - cli",
          "- classification_rationale: semantic mismatch execution fixture",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: semantic mismatch test",
          "  allowed_modes:",
          "    - low-cost",
          "    - full-harness",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(runPrototypingExecution({ root })).rejects.toThrow(
        /recommendation artifact is invalid/i,
      );
    });
  });

  it("rejects semantic mismatch artifact even with explicit requestedMode", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        [
          "# Context",
          "",
          "- ui_bearing: true",
          "- primary_surface: web",
          "- secondary_surfaces:",
          "  - cli",
          "- classification_rationale: semantic mismatch with explicit mode fixture",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: semantic mismatch with explicit mode",
          "  allowed_modes:",
          "    - low-cost",
          "    - full-harness",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Even with explicit mode, semantic mismatch must be hard rejected
      await expect(runPrototypingExecution({ root, requestedMode: "standard" })).rejects.toThrow(
        /recommendation artifact is invalid/i,
      );
    });
  });
});
