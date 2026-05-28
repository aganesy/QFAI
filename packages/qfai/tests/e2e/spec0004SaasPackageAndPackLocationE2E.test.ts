/**
 * E2E: spec-0004 CHG-006 — saas-package validate profile (honest skip
 * findings), dual-shape `primary_tasks` (string + structured), and the
 * pack-location CI lane. Authored test-first (skip) pending
 * /qfai-implement: the saas-package profile, `auditProfile.ts` dual-shape
 * acceptance, and `check-pack-locations.mjs` do not yet exist, so every
 * `it` is `.skip` and shells out to the CLI binary via a local execFile
 * helper. /qfai-implement removes `.skip` to turn these green.
 */
// QFAI:SPEC-0004:US-0004-0037
// QFAI:SPEC-0004:US-0004-0038
// QFAI:SPEC-0004:US-0004-0039

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
  it("QFAI:SPEC-0004:US-0004-0037 — saas-package validate PASSes with honest D-SAAS-PACKAGE-VERIFY-SKIPPED skip findings (normal)", async () => {
    // Normal: prototyping PASSes + DCON-005 attestation present + CLI-HANDOFF
    // conforms → validate PASSes and names each skipped ATDD/implement gate
    // via a D-SAAS-PACKAGE-VERIFY-SKIPPED (info) finding.
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    expect(res.code).toBe(0);
    const body = JSON.parse(res.stdout) as {
      profile?: string;
      issues: Array<{ code: string; severity: string }>;
    };
    expect(body.profile).toBe("saas-package");
    const skips = body.issues.filter((i) => i.code === "D-SAAS-PACKAGE-VERIFY-SKIPPED");
    expect(skips.length).toBeGreaterThan(0);
    expect(skips.every((i) => i.severity === "info")).toBe(true);
  });

  it("QFAI:SPEC-0004:US-0004-0037 — saas-package validate does NOT PASS when the DCON-005 attestation is missing (error)", async () => {
    // Error: design-system.yaml removed → validate must not PASS and must
    // name the absent attestation rather than silently claim a green gate.
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/design-system\.yaml|DCON-005/);
  });
});

describe.skip("spec-0004 primary_tasks dual-shape CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0004:US-0004-0038 — auditProfile accepts both string-only and structured primary_tasks (normal)", async () => {
    // Normal: a UI contract with string-only primary_tasks and a sibling with
    // structured {id,label,acceptance} items both pass during the
    // deprecation window.
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    expect(res.code).toBe(0);
    expect(res.stdout).not.toMatch(/primary_tasks.*rejected/i);
  });

  it("QFAI:SPEC-0004:US-0004-0038 — QFAI-AUD-020 warning names the 3..7 count band and the closed structured schema rejects an item missing acceptance (error/boundary)", async () => {
    // Boundary: 9 primary_tasks (over-band) → QFAI-AUD-020 warning naming the
    // 3..7 band. Error: a structured item missing `acceptance` is rejected by
    // the closed (additionalProperties:false) schema.
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    const out = res.stdout + res.stderr;
    expect(out).toMatch(/QFAI-AUD-020/);
    expect(out).toMatch(/3\.\.7|3-7/);
  });
});

describe.skip("spec-0004 pack-location CI lane CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0004:US-0004-0039 — check-pack-locations rejects a misplaced root review pack with R-PACK-LOCATION-DRIFT (error)", async () => {
    // Error: a review-* directory introduced at the repo root → lane FAILS
    // with R-PACK-LOCATION-DRIFT referencing root-additions-policy.md and
    // proposing the correct .qfai/review/<ts>/ path.
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    const out = res.stdout + res.stderr;
    expect(out).toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(out).toMatch(/root-additions-policy\.md/);
  });

  it("QFAI:SPEC-0004:US-0004-0039 — lane passes silently for packs placed under allowed roots (normal)", async () => {
    // Normal: a discussion pack under .qfai/discussion/<ts>/ plus an
    // unrelated edit → lane passes with no R-PACK-LOCATION-DRIFT.
    const res = await runCli(["validate", "--profile", "saas-package", "--format", "json"]);
    expect(res.stdout).not.toMatch(/R-PACK-LOCATION-DRIFT/);
  });
});
