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
});
