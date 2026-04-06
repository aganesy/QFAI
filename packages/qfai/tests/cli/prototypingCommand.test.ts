import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runPrototypingCommand } from "../../src/cli/commands/prototyping.js";
import { captureStdout } from "../helpers/stdout.js";

describe("runPrototypingCommand", () => {
  it("prints generated evidence paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-prototyping-"));
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
          "- classification_rationale: cli prototyping command fixture",
          "",
        ].join("\n"),
        "utf-8",
      );

      const output = await captureStdout(async () => {
        await runPrototypingCommand({ root, mode: "standard" });
      });

      expect(output).toContain("mode: standard");
      expect(output).toContain(".qfai");

      const prototyping = JSON.parse(
        await readFile(path.join(root, ".qfai", "evidence", "prototyping.json"), "utf-8"),
      ) as { meta?: { generatedBy?: string } };
      expect(prototyping.meta?.generatedBy).toBe("qfai prototyping run");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid classification via CLI", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-prototyping-"));
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

      await expect(runPrototypingCommand({ root, mode: "standard" })).rejects.toThrow(
        /invalid|contradictory/i,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects contradictory non-ui classification via CLI", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-prototyping-"));
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

      await expect(runPrototypingCommand({ root, mode: "standard" })).rejects.toThrow(
        /invalid|contradictory/i,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("valid UI-bearing classification proceeds via CLI", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-prototyping-"));
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
          "- classification_rationale: valid ui-bearing web fixture",
          "",
        ].join("\n"),
        "utf-8",
      );

      const output = await captureStdout(async () => {
        await runPrototypingCommand({ root, mode: "standard" });
      });

      expect(output).toContain("mode: standard");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("CLI rejects stale coexist artifact and proceeds with explicit mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-prototyping-"));
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
          "- classification_rationale: stale coexist CLI fixture",
          "",
        ].join("\n"),
        "utf-8",
      );

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
          "- classification_rationale: stale coexist CLI fixture",
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

      // CLI should still work with explicit mode; stale coexist recommendation is rejected
      const output = await captureStdout(async () => {
        await runPrototypingCommand({ root, mode: "standard" });
      });

      expect(output).toContain("mode: standard");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("CLI accepts namespaced-only valid artifact", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-prototyping-"));
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
          "- classification_rationale: namespaced-only CLI fixture",
          "",
        ].join("\n"),
        "utf-8",
      );

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
          "- classification_rationale: namespaced-only CLI fixture",
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

      const output = await captureStdout(async () => {
        await runPrototypingCommand({ root });
      });

      // Should adopt the namespaced recommendation
      expect(output).toContain("mode: low-cost");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
