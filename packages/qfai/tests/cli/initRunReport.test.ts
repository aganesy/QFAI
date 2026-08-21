/**
 * `qfai init` allocated its verbosity to the wrong list.
 *
 * `report()` enumerated `skipped` in full and collapsed `copied` to a single
 * integer. In a dry run `skipped` is always empty — nothing can be skipped when
 * nothing is written — so `--dry-run`, the one mode whose whole purpose is to
 * answer "what is this about to touch", answered with a bare count. The
 * inverse, a no-op re-run over an already-initialized tree, dumped every
 * skipped path even though by definition nothing needed review.
 *
 * The `created:` heading also never adapted to `dryRun`, so a past-tense line
 * sat directly under the `dry-run` header while `removed` and `.gitignore`
 * already phrased both sides.
 */

import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

describe("qfai init run report", { timeout: 60000 }, () => {
  it("enumerates the paths a --dry-run would create, in the future tense", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: true, yes: true });
      });

      expect(output).toMatch(/ {2}would create:\s*\d+/);
      expect(output).toContain("  would create paths:");
      expect(output).toContain("DESIGN.md");
      // The past-tense heading must not appear under a dry-run header.
      expect(output).not.toMatch(/ {2}created:\s*\d+/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("enumerates the paths a real run created, in the past tense", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(output).toMatch(/ {2}created:\s*\d+/);
      expect(output).toContain("  created paths:");
      expect(output).toContain("DESIGN.md");
      expect(output).not.toContain("would create");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("collapses skipped to a count on a no-op re-run and points at --verbose", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(secondRun).toMatch(/ {2}skipped:\s*\d+/);
      expect(secondRun).not.toContain("skipped paths:");
      expect(secondRun).toContain("--verbose");
      // The no-op re-run must stay short: header + counts + hint, not 394 paths.
      expect(secondRun.split("\n").filter((line) => line.trim().startsWith("- "))).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists the skipped paths when --verbose is supplied", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true, verbose: true });
      });

      expect(secondRun).toContain("  skipped paths:");
      expect(secondRun).toContain("DESIGN.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
