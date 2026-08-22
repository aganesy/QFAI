// QFAI:SPEC-0006:TC-0006-0022
//
// Error/boundary: `qfai doctor --autoremediate` is disabled in CI by
// default (process.env.CI === "true" path) and surfaces the
// "autoremediate disabled in CI" line without performing any remediation.
// The `--dry-run` flag preview-only path performs zero side effects on
// install / archive / config-write.

import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAutoremediate } from "../../../../src/core/doctor/autoremediate.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-ci-${label}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe("doctor --autoremediate CI-off / --dry-run side-effect gates", () => {
  it("CI=true short-circuits with 'autoremediate disabled in CI'", async () => {
    const root = await newTempDir("ci");
    const oldTs = "20260401120000333";
    const oldDir = path.join(root, ".qfai", "review", `review-${oldTs}`);
    await mkdir(oldDir, { recursive: true });
    const mtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(oldDir, mtime, mtime);

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: true,
    });

    expect(summary.disabledInCi).toBe(true);
    expect(summary.lines.join("\n")).toContain("autoremediate disabled in CI");
    // No archival despite the stale pack.
    expect(await fileExists(oldDir)).toBe(true);
    expect(
      await fileExists(path.join(root, ".qfai", "review", "_archive", `review-${oldTs}`)),
    ).toBe(false);
    expect(summary.installed).toEqual([]);
    expect(summary.archived).toEqual([]);
    expect(summary.configFieldsWritten).toEqual([]);
  });

  it("--dry-run yields no install / archive / config-write side effects", async () => {
    const root = await newTempDir("dry");
    // Seed skill manifest declaring a missing dep.
    const manifestDir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
      "utf-8",
    );
    // Seed a stale pack.
    const oldTs = "20260401120000444";
    const oldDir = path.join(root, ".qfai", "review", `review-${oldTs}`);
    await mkdir(oldDir, { recursive: true });
    const mtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(oldDir, mtime, mtime);
    // Seed minimal config WITHOUT review section.
    const configPath = path.join(root, "qfai.config.yaml");
    await writeFile(configPath, "paths:\n  specsDir: .qfai/specs\n", "utf-8");
    const originalConfig = await readFile(configPath, "utf-8");

    const installCalls: string[] = [];
    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
      installRunner: async (name) => {
        installCalls.push(name);
      },
    });

    expect(summary.disabledInCi).toBe(false);
    // No install side effect.
    expect(installCalls).toEqual([]);
    expect(summary.installed).toEqual([]);
    // No archival side effect (pack remains in top-level).
    expect(await fileExists(oldDir)).toBe(true);
    expect(
      await fileExists(path.join(root, ".qfai", "review", "_archive", `review-${oldTs}`)),
    ).toBe(false);
    // No config write side effect.
    expect(await readFile(configPath, "utf-8")).toBe(originalConfig);
    expect(summary.configFieldsWritten).toEqual([]);
    // Dry-run line surfaced.
    expect(summary.lines.join("\n")).toMatch(/dry-run/u);
    // The archive plan is reported in the FUTURE tense. `cleanStaleReviewPacks`
    // still populates `archived` under dry-run (the packs a live run would
    // move), so the past-tense `review packs archived=N` wording read as a
    // completed archive and an operator checking the preview saw packs already
    // gone. `--clean --dry-run` says `would move ->`; so must this.
    const dryRunLines = summary.lines.join("\n");
    expect(dryRunLines).not.toMatch(/review packs archived=/u);
    expect(dryRunLines).toContain("autoremediate: would archive review packs=1");
    expect(dryRunLines).toContain(`  would move -> _archive/review-${oldTs}`);
  });
});
