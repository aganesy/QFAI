// QFAI:SPEC-0006:TC-0006-0025
// QFAI:SPEC-0006:TC-0006-0026
// QFAI:SPEC-0006:TC-0006-0027
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readDiscussionRecommendation } from "../../../src/core/prototyping/discussionReader.js";

describe("readDiscussionRecommendation", () => {
  async function withTempDir(task: (dir: string) => Promise<void>) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-disc-reader-"));
    try {
      await task(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  describe("TC-0006-0025: recommendation fields present", () => {
    it("extracts recommended_mode and rationale from valid discussion sidecar YAML", async () => {
      await withTempDir(async (dir) => {
        const packDir = path.join(dir, "discussion-20260330000000000");
        await mkdir(packDir, { recursive: true });
        await writeFile(
          path.join(packDir, "prototyping.yaml"),
          [
            "prototyping:",
            '  recommended_mode: "standard"',
            '  rationale: "Project has UI contracts and local dev server"',
          ].join("\n"),
        );

        const result = await readDiscussionRecommendation(packDir);
        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.recommended_mode).toBe("standard");
        expect(result.rationale).toBe("Project has UI contracts and local dev server");
      });
    });

    it("accepts low-cost as a valid recommended_mode", async () => {
      await withTempDir(async (dir) => {
        const packDir = path.join(dir, "discussion-20260330000000000");
        await mkdir(packDir, { recursive: true });
        await writeFile(
          path.join(packDir, "prototyping.yaml"),
          [
            "prototyping:",
            '  recommended_mode: "low-cost"',
            '  rationale: "Static-only project"',
          ].join("\n"),
        );

        const result = await readDiscussionRecommendation(packDir);
        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.recommended_mode).toBe("low-cost");
      });
    });

    it("accepts full-harness as a valid recommended_mode", async () => {
      await withTempDir(async (dir) => {
        const packDir = path.join(dir, "discussion-20260330000000000");
        await mkdir(packDir, { recursive: true });
        await writeFile(
          path.join(packDir, "prototyping.yaml"),
          [
            "prototyping:",
            '  recommended_mode: "full-harness"',
            '  rationale: "Full integration needed"',
          ].join("\n"),
        );

        const result = await readDiscussionRecommendation(packDir);
        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.recommended_mode).toBe("full-harness");
      });
    });
  });

  describe("TC-0006-0026: optional section absent", () => {
    it("returns null recommendation when prototyping section is omitted", async () => {
      await withTempDir(async (dir) => {
        const packDir = path.join(dir, "discussion-20260330000000000");
        await mkdir(packDir, { recursive: true });
        // No prototyping.yaml file at all
        const result = await readDiscussionRecommendation(packDir);
        expect(result).toEqual({ recommended_mode: null, rationale: null });
      });
    });

    it("returns null recommendation when YAML exists but has no prototyping key", async () => {
      await withTempDir(async (dir) => {
        const packDir = path.join(dir, "discussion-20260330000000000");
        await mkdir(packDir, { recursive: true });
        await writeFile(path.join(packDir, "prototyping.yaml"), "other_section:\n  key: value\n");

        const result = await readDiscussionRecommendation(packDir);
        expect(result).toEqual({ recommended_mode: null, rationale: null });
      });
    });
  });

  describe("TC-0006-0027: invalid mode value", () => {
    it("returns null recommended_mode when value is not a valid mode", async () => {
      await withTempDir(async (dir) => {
        const packDir = path.join(dir, "discussion-20260330000000000");
        await mkdir(packDir, { recursive: true });
        await writeFile(
          path.join(packDir, "prototyping.yaml"),
          ["prototyping:", '  recommended_mode: "turbo"', '  rationale: "Should be ignored"'].join(
            "\n",
          ),
        );

        const result = await readDiscussionRecommendation(packDir);
        expect(result).not.toBeNull();
        if (!result) return;
        expect(result.recommended_mode).toBeNull();
        expect(result.rationale).toBe("Should be ignored");
      });
    });
  });
});
