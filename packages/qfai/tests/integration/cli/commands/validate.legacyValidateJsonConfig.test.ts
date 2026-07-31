/**
 * Integration test — `runValidate` must NOT silently write to the
 * legacy `.qfai/output/validate.json` SSOT when a project config still
 * names it as `output.validateJsonPath` and the running tool is at or
 * past the announced sunset.
 *
 * The prior writer dispatched on a single field (`validateJsonPath`)
 * and decided severity from the tool version separately, so a config
 * still pointing at the legacy literal would:
 *   - pre-sunset: write the legacy file (correct, with warning)
 *   - post-sunset: STILL write the legacy file, AND not emit
 *     `D-DEPRECATED-PATH` (the existing emission logic only checked
 *     the on-disk legacy file, not the configured writer target).
 *
 * The migration gate fix wires the config-targets-legacy-path signal
 * into both the writer and the emission logic:
 *   - pre-sunset + config points at legacy literal:
 *       write proceeds, `D-DEPRECATED-PATH` warning fires with
 *       config-aware message text.
 *   - post-sunset + config points at legacy literal:
 *       write is REFUSED, `D-DEPRECATED-PATH` ERROR fires directing
 *       the operator to update `output.validateJsonPath` to
 *       `.qfai/report/validate.json`.
 *   - config points elsewhere (default `.qfai/report/validate.json`):
 *       no behavioral change vs the pre-fix tests under spec-0004.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function seedLegacyConfig(root: string): Promise<void> {
  // qfai.config.yaml with output.validateJsonPath pinned to the legacy SSOT.
  const yaml = ["output:", "  validateJsonPath: .qfai/output/validate.json", ""].join("\n");
  await writeFile(path.join(root, "qfai.config.yaml"), yaml, "utf-8");
}

let root: string;
let savedCiEnv: string | undefined;
let savedGhaEnv: string | undefined;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-validate-legacycfg-"));
  // runValidate's buildCiProfileIssue() reads process.env.CI /
  // GITHUB_ACTIONS and rejects narrow profiles (prototyping, atdd,
  // discussion) with QFAI-VALIDATE-017 when CI is set. These tests
  // exercise the partial `prototyping` profile to scope the legacy
  // validate-json deprecation surface, so we explicitly unset both
  // env vars for the duration of each test and restore them in
  // afterEach. Local runs are unaffected (CI is unset); CI runs no
  // longer false-fire QFAI-VALIDATE-017 against this integration.
  savedCiEnv = process.env.CI;
  savedGhaEnv = process.env.GITHUB_ACTIONS;
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  if (savedCiEnv !== undefined) process.env.CI = savedCiEnv;
  if (savedGhaEnv !== undefined) process.env.GITHUB_ACTIONS = savedGhaEnv;
});

describe("config validateJsonPath = legacy literal — pre-sunset", () => {
  it("PRE-sunset (1.9.1): writer proceeds AND D-DEPRECATED-PATH warning fires with config-aware message", async () => {
    await seedLegacyConfig(root);

    const exit = await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.9.1",
    });
    expect(exit).toBe(0);

    const legacy = path.join(root, ".qfai/output/validate.json");
    expect(await pathExists(legacy)).toBe(true);

    const body = JSON.parse(await readFile(legacy, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("warning");
    // Config-aware message text must surface the qfai.config.yaml field.
    expect(dep?.message).toContain("qfai.config.yaml");
    expect(dep?.message).toContain("validateJsonPath");
    expect(dep?.message).toContain(".qfai/output/validate.json");
  });
});

describe("config validateJsonPath = legacy literal — post-sunset", () => {
  it("AT sunset (1.10.0): writer REFUSES the legacy write AND D-DEPRECATED-PATH error fires with actionable migration text on stdout", async () => {
    await seedLegacyConfig(root);

    // Capture text-format stdout so we can inspect the D-DEPRECATED-PATH
    // finding — when the writer refuses to write the configured legacy
    // path, the JSON report cannot be on disk at that location, so the
    // operator's discoverability surface is the text/github output.
    const stdoutChunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    }) as typeof process.stdout.write;
    let exit: number;
    try {
      exit = await runValidate({
        root,
        strict: false,
        profile: "prototyping",
        // failOn defaults to "error"; severity=error from D-DEPRECATED-PATH
        // is expected to fail the run, which proves the migration gate
        // actually gates.
        toolVersionOverride: "1.10.0",
        format: "text",
      });
    } finally {
      process.stdout.write = origWrite;
    }
    expect(exit).toBe(1);

    // The configured legacy path must NOT exist — the writer refused.
    const legacy = path.join(root, ".qfai/output/validate.json");
    expect(await pathExists(legacy)).toBe(false);

    // No canonical-report side-write either: the operator's configured
    // target was the legacy literal, and the writer respects that target
    // (refused). The finding surfaces on the text output channel.
    const stdout = stdoutChunks.join("");
    expect(stdout).toMatch(/\[error\] D-DEPRECATED-PATH/);
    expect(stdout).toContain("REFUSED");
    expect(stdout).toContain("output.validateJsonPath");
    expect(stdout).toContain(".qfai/report/validate.json");
  });

  it("AT sunset (1.10.0): a --spec-scoped run is refused too, not just the shared write", async () => {
    // `scopedReportPath` derives its directory from `output.validateJsonPath`,
    // so a scoped run against a legacy-configured project would write
    // `.qfai/output/validate.spec-0001.json` — a NEW file under the very
    // directory the migration gate exists to retire, which reads to an
    // operator as "still fine to write here".
    await seedLegacyConfig(root);

    const exit = await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
      format: "text",
      specIds: ["spec-0001"],
    });
    expect(exit).toBe(1);

    const legacyDir = path.join(root, ".qfai/output");
    const scoped = path.join(legacyDir, "validate.spec-0001.json");
    expect(await pathExists(scoped)).toBe(false);
    expect(await pathExists(path.join(legacyDir, "validate.json"))).toBe(false);
  });
});

describe("config validateJsonPath = canonical (non-legacy)", () => {
  it("POST-sunset + non-legacy config + no stale legacy file: write proceeds, no D-DEPRECATED-PATH emission", async () => {
    // No config file at all — falls back to default
    // `.qfai/report/validate.json`. Clean project, no legacy on disk.
    const exit = await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });
    expect(exit).toBe(0);

    const canonical = path.join(root, ".qfai/report/validate.json");
    expect(await pathExists(canonical)).toBe(true);
    const legacy = path.join(root, ".qfai/output/validate.json");
    expect(await pathExists(legacy)).toBe(false);

    const body = JSON.parse(await readFile(canonical, "utf-8")) as {
      issues: Array<{ code: string }>;
    };
    expect(body.issues.find((i) => i.code === "D-DEPRECATED-PATH")).toBeUndefined();
  });

  it("POST-sunset + non-legacy config + STALE legacy file on disk: write proceeds, D-DEPRECATED-PATH error fires (existing behavior preserved)", async () => {
    // Pre-seed a stale legacy file — proves the legacy-on-disk emission
    // path still fires and is not regressed by the new config-aware path.
    const legacy = path.join(root, ".qfai/output/validate.json");
    await mkdir(path.dirname(legacy), { recursive: true });
    await writeFile(legacy, '{"stale": "pre-sunset"}', "utf-8");

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });

    // Stale legacy file is preserved (validate does not delete it).
    expect(await pathExists(legacy)).toBe(true);

    const canonical = path.join(root, ".qfai/report/validate.json");
    const body = JSON.parse(await readFile(canonical, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("error");
    // On-disk stale message, NOT the config-refused message.
    expect(dep?.message).toContain("still exists on disk");
  });
});
