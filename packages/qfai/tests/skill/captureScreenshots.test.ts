/**
 * capture-screenshots.js asset existence test — spec-0012
 *
 * QFAI:SPEC-0012:TC-0012-0291
 *
 * Verifies that the capture-screenshots.js utility script exists under
 * packages/qfai/assets/scripts/ and that its filename pattern is correct.
 */

import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readdir, rm } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const SCRIPTS_DIR = path.resolve(import.meta.dirname, "../../assets/scripts");

const SCRIPT_PATH = path.join(SCRIPTS_DIR, "capture-screenshots.js");

// ─── TC-0012-0291: capture-screenshots.js exists ─────────────────────────────

describe("TC-0012-0291 — capture-screenshots.js exists in QFAI package", () => {
  // QFAI:SPEC-0012:TC-0012-0291
  it("packages/qfai/assets/scripts/capture-screenshots.js is present", async () => {
    await expect(access(SCRIPT_PATH)).resolves.toBeUndefined();
  });

  it("script filename matches expected pattern capture-screenshots.js", () => {
    expect(path.basename(SCRIPT_PATH)).toBe("capture-screenshots.js");
  });

  it("fails instead of writing a stub PNG when capture cannot complete", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "qfai-capture-fail-"));
    try {
      const result = spawnSync(
        process.execPath,
        [SCRIPT_PATH, "--url", "http://127.0.0.1:9", "--out", outDir],
        { encoding: "utf-8" },
      );

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("Error: capture failed");
      await expect(access(path.join(outDir, "manifest.json"))).rejects.toThrow();
      const files = await readdir(outDir);
      expect(files.some((file) => file.endsWith(".png"))).toBe(false);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
