/**
 * Integration: spec-0004 CHG-006 — saas-package validate profile, DCON-005
 * attestation gate, dual-shape `primary_tasks` accept/reject, and the
 * `check-pack-locations.mjs` CI lane (allowed-root PASS, misplaced-pack
 * FAIL, untouched-legacy scope edge). Authored test-first (skip) pending
 * /qfai-implement: the saas-package profile, auditProfile dual-shape and
 * the pack-location lane do not yet exist, so every `it` is `.skip` and
 * shells out to the CLI binary via a local execFile helper.
 */
// QFAI:SPEC-0004:TC-0004-0067
// QFAI:SPEC-0004:TC-0004-0068
// QFAI:SPEC-0004:TC-0004-0069
// QFAI:SPEC-0004:TC-0004-0070
// QFAI:SPEC-0004:TC-0004-0071
// QFAI:SPEC-0004:TC-0004-0072
// QFAI:SPEC-0004:TC-0004-0073

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

describe.skip("spec-0004 saas-package profile CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0004:TC-0004-0067 — saas-package validate PASSes and emits one D-SAAS-PACKAGE-VERIFY-SKIPPED per skipped gate (normal)", async () => {
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    expect(res.code).toBe(0);
    const body = JSON.parse(res.stdout) as { issues: Array<{ code: string; severity: string }> };
    const skips = body.issues.filter((i) => i.code === "D-SAAS-PACKAGE-VERIFY-SKIPPED");
    expect(skips.length).toBeGreaterThan(0);
    expect(skips.every((i) => i.severity === "info")).toBe(true);
  });

  it("QFAI:SPEC-0004:TC-0004-0068 — saas-package validate does NOT PASS when DCON-005 attestation is removed (error/boundary)", async () => {
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/design-system\.yaml|DCON-005|attestation/);
  });
});

describe.skip("spec-0004 primary_tasks dual-shape CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0004:TC-0004-0069 — auditProfile accepts string-only and structured {id,label,acceptance} primary_tasks (normal)", async () => {
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    expect(res.code).toBe(0);
  });

  it("QFAI:SPEC-0004:TC-0004-0070 — QFAI-AUD-020 fires for 9 tasks naming the 3..7 band; structured item missing acceptance is rejected (error/boundary)", async () => {
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    const out = res.stdout + res.stderr;
    expect(out).toMatch(/QFAI-AUD-020/);
    expect(out).toMatch(/3\.\.7|3-7/);
    expect(out).toMatch(/acceptance/);
  });
});

describe.skip("spec-0004 pack-location CI lane CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0004:TC-0004-0071 — root review-2026-05-27/ FAILS the lane with R-PACK-LOCATION-DRIFT proposing the correct path (error/boundary)", async () => {
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    const out = res.stdout + res.stderr;
    expect(res.code).not.toBe(0);
    expect(out).toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(out).toMatch(/root-additions-policy\.md/);
    expect(out).toMatch(/\.qfai\/review\//);
  });

  it("QFAI:SPEC-0004:TC-0004-0072 — pack under .qfai/discussion/<ts>/ plus unrelated edit passes silently (normal)", async () => {
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    expect(res.stdout).not.toMatch(/R-PACK-LOCATION-DRIFT/);
  });

  it("QFAI:SPEC-0004:TC-0004-0073 — untouched pre-existing legacy review-old/ is not re-flagged (changed-dir scope edge)", async () => {
    // Boundary/scope: PR touches no pack dir while a legacy review-old/
    // exists untouched → lane passes; untouched legacy is out of changed-dir
    // scope (DR-0274), so no R-PACK-LOCATION-DRIFT.
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    expect(res.stdout).not.toMatch(/R-PACK-LOCATION-DRIFT/);
  });
});
