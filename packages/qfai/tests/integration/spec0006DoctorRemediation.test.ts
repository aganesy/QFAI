/**
 * Integration: spec-0006 CHG-006 — `doctor --clean` TTL archival (archive +
 * never-delete + validate review excludes _archive + TTL override),
 * `doctor --autoremediate` (install+clean+config, CI-off / --dry-run), and
 * the per-skill `runtimeDependencies` probe (probe + empty-list + drift).
 * Authored test-first (skip) pending /qfai-implement: these behaviors do
 * not yet exist, so every `it` is `.skip` and shells out to the CLI binary
 * via a local execFile helper.
 */
// QFAI:SPEC-0006:TC-0006-0019
// QFAI:SPEC-0006:TC-0006-0020
// QFAI:SPEC-0006:TC-0006-0021
// QFAI:SPEC-0006:TC-0006-0022
// QFAI:SPEC-0006:TC-0006-0023
// QFAI:SPEC-0006:TC-0006-0024
// QFAI:SPEC-0006:TC-0006-0025
// QFAI:SPEC-0006:TC-0006-0026

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
  it("QFAI:SPEC-0006:TC-0006-0019 — --clean archives a TTL-expired review pack into _archive/ (normal)", async () => {
    const res = await runCli(["doctor", "--clean", "--format", "text"]);
    expect(res.code).toBe(0);
    expect(res.stdout + res.stderr).toMatch(/_archive/);
  });

  it("QFAI:SPEC-0006:TC-0006-0020 — --clean never deletes; validate --profile review excludes _archive (boundary)", async () => {
    await runCli(["doctor", "--clean", "--format", "text"]);
    const res = await runCli(["validate", "--profile", "review", "--format", "json"]);
    expect(res.stdout).not.toMatch(/_archive/);
  });

  it("QFAI:SPEC-0006:TC-0006-0023 — review.staleTtlDays config override shifts the TTL archival boundary (boundary)", async () => {
    // NOTE: spec classifies this TC as Level: unit. Annotated here because
    // the /qfai-atdd obligation list spans TC-0006-0019..0026; see report.
    const res = await runCli(["doctor", "--clean", "--format", "text"]);
    expect(res.code).toBe(0);
  });
});

describe.skip("spec-0006 doctor --autoremediate CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0006:TC-0006-0021 — --autoremediate --yes fixes install + clean + config (normal)", async () => {
    const res = await runCli(["doctor", "--autoremediate", "--yes", "--format", "text"]);
    expect(res.code).toBe(0);
  });

  it("QFAI:SPEC-0006:TC-0006-0022 — autoremediate defaults off in CI; --dry-run yields no side effects (error)", async () => {
    const res = await runCli(["doctor", "--autoremediate", "--dry-run", "--format", "text"]);
    expect(res.stdout + res.stderr).toMatch(/autoremediate disabled in CI|dry-run/i);
  });
});

describe.skip("spec-0006 per-skill runtimeDependencies probe CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0006:TC-0006-0024 — --profile <skill> probes manifest runtimeDependencies; missing reported with install command (normal)", async () => {
    const res = await runCli(["doctor", "--profile", "qfai-atdd", "--format", "text"]);
    expect(res.stdout + res.stderr).toMatch(/runtimeDependencies|npm install/i);
  });

  it("QFAI:SPEC-0006:TC-0006-0025 — empty runtimeDependencies emits no probe finding (boundary)", async () => {
    // NOTE: spec classifies this TC as Level: unit. Annotated here because
    // the /qfai-atdd obligation list spans TC-0006-0019..0026; see report.
    const res = await runCli(["doctor", "--profile", "qfai-atdd", "--format", "text"]);
    expect(res.stdout + res.stderr).not.toMatch(/R-SKILL-MANIFEST-DRIFT/);
  });

  it("QFAI:SPEC-0006:TC-0006-0026 — manifest↔probe drift emits R-SKILL-MANIFEST-DRIFT (error)", async () => {
    const res = await runCli(["doctor", "--profile", "qfai-atdd", "--format", "text"]);
    expect(res.stdout + res.stderr).toMatch(/R-SKILL-MANIFEST-DRIFT/);
  });
});
