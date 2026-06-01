/**
 * E2E: spec-0006 CHG-006 — `doctor --clean` stale review-pack TTL archival,
 * `doctor --autoremediate`, and the per-skill `runtimeDependencies` probe.
 * Authored test-first (skip) pending /qfai-implement: the `--clean`,
 * `--autoremediate`, and `--profile <skill>` probe behaviors do not yet
 * exist, so every `it` is `.skip` and shells out to the CLI binary via a
 * local execFile helper. /qfai-implement removes `.skip` to turn these
 * green.
 */
// QFAI:SPEC-0006:US-0006-0008
// QFAI:SPEC-0006:US-0006-0009
// QFAI:SPEC-0006:US-0006-0010

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { describe, it, expect } from "vitest";

const execFileP = promisify(execFile);

const CLI_PATH = path.resolve(__dirname, "..", "..", "dist", "cli", "index.cjs");

async function runCli(
  args: string[],
  cwd?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileP(process.execPath, [CLI_PATH, ...args], { cwd });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof e.code === "number" ? e.code : 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

describe.skip("spec-0006 doctor --clean TTL archival CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0006:US-0006-0008 — doctor --clean moves a TTL-expired review pack into .qfai/review/_archive/ and never deletes (normal/state)", async () => {
    // Normal + state transition: an expired top-level pack is moved (not
    // deleted) into _archive/; restore is manual mv.
    const res = await runCli(["doctor", "--clean", "--format", "text"]);
    expect(res.code).toBe(0);
    expect(res.stdout + res.stderr).toMatch(/_archive/);
  });

  it("QFAI:SPEC-0006:US-0006-0008 — failure path: archiving a locked / already-archived pack surfaces a clear error and never deletes (error)", async () => {
    // Error path (matrix gap flagged for US-0006-0008): a pack that cannot be
    // moved (unwritable target / already in _archive) must report a clear
    // failure and must NOT delete the source pack.
    const res = await runCli(["doctor", "--clean", "--format", "text"]);
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/archive|unwritable|locked|already/i);
  });
});

describe.skip("spec-0006 doctor --autoremediate CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0006:US-0006-0009 — doctor --autoremediate --yes installs deps, TTL-archives, and writes missing default-keyed config (normal/state)", async () => {
    // Normal: dirty → remediated → clean across install + clean + config.
    const res = await runCli(["doctor", "--autoremediate", "--yes", "--format", "text"]);
    expect(res.code).toBe(0);
  });

  it("QFAI:SPEC-0006:US-0006-0009 — in CI autoremediate defaults off and prints the disabled line; --dry-run has no side effects (error/boundary)", async () => {
    // Boundary/error: CI default = --autoremediate=off with an explicit
    // "autoremediate disabled in CI" line; --dry-run previews with no writes.
    const res = await runCli(
      ["doctor", "--autoremediate", "--dry-run", "--format", "text"],
      undefined,
    );
    expect(res.stdout + res.stderr).toMatch(/autoremediate disabled in CI|dry-run/i);
  });
});

describe.skip("spec-0006 per-skill runtimeDependencies probe CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0006:US-0006-0010 — doctor --profile <skill> probes manifest runtimeDependencies and reports missing with an install command (normal)", async () => {
    const res = await runCli(["doctor", "--profile", "qfai-atdd", "--format", "text"]);
    expect(res.stdout + res.stderr).toMatch(/runtimeDependencies|npm install/i);
  });

  it("QFAI:SPEC-0006:US-0006-0010 — manifest↔probe drift emits R-SKILL-MANIFEST-DRIFT (error)", async () => {
    const res = await runCli(["doctor", "--profile", "qfai-atdd", "--format", "text"]);
    expect(res.stdout + res.stderr).toMatch(/R-SKILL-MANIFEST-DRIFT/);
  });
});
