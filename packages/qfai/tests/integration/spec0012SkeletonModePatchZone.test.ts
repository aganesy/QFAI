/**
 * Integration acceptance for spec-0012 CHG-006 test cases
 * TC-0012-0471..0480 (emit-skeletons coverage, DESIGN.md patch-zone,
 * prototyping.mode discriminator, taskFidelity keywords, mutation-log).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper against the (existing) CLI binary; the CHG-006
 * flags/validators they exercise are unimplemented, so the bodies
 * never execute. `/qfai-implement` removes `.skip` to turn them green.
 * Imports nothing from the not-yet-built source surface.
 */
// QFAI:SPEC-0012:TC-0012-0471
// QFAI:SPEC-0012:TC-0012-0472
// QFAI:SPEC-0012:TC-0012-0473
// QFAI:SPEC-0012:TC-0012-0474
// QFAI:SPEC-0012:TC-0012-0475
// QFAI:SPEC-0012:TC-0012-0476
// QFAI:SPEC-0012:TC-0012-0477
// QFAI:SPEC-0012:TC-0012-0478
// QFAI:SPEC-0012:TC-0012-0479
// QFAI:SPEC-0012:TC-0012-0480

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(TEST_DIR, "..", "..", "dist", "cli", "index.mjs");

async function runCli(
  args: readonly string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI_PATH, ...args], { cwd });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

describe.skip("spec-0012 emit-skeletons coverage CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:TC-0012-0471 — normal: iterate --cycle 0 --emit-skeletons over a multi-spec frozenSurfaceUnion writes one DESIGN.md-token placeholder HTML per screen (no per-screen LLM call); post-convergence every union screen carries screenshot+html cross-spec", async () => {
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--emit-skeletons", "--target-url", "http://localhost:5173"],
      process.cwd(),
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/screenshot/);
    expect(r.stdout).toMatch(/html/);
  });

  it("QFAI:SPEC-0012:TC-0012-0472 — boundary: iterate --cycle 0 WITHOUT --emit-skeletons emits zero skeleton files (v1.9.1 no-regression); --skeleton-mode full escalates to per-screen generation while default placeholder does not", async () => {
    const noFlag = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--target-url", "http://localhost:5173"],
      process.cwd(),
    );
    expect(noFlag.code).toBe(0);
    expect(noFlag.stdout).not.toMatch(/skeleton/i);
    const full = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--emit-skeletons", "--skeleton-mode", "full", "--target-url", "http://localhost:5173"],
      process.cwd(),
    );
    expect(full.stdout).toMatch(/full/);
  });
});

describe.skip("spec-0012 DESIGN.md patch_zone CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:TC-0012-0473 — normal: an edit fully contained in the front-matter patch_zone updates only patchHash; majorHash is byte-stable and prototyping evidence stays valid", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).not.toMatch(/R-DESIGN-MD-PATCH-OUT-OF-ZONE/);
  });

  it("QFAI:SPEC-0012:TC-0012-0474 — error: an out-of-zone edit (or removal of the patch_zone block) invalidates evidence and emits R-DESIGN-MD-PATCH-OUT-OF-ZONE (warning)", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/R-DESIGN-MD-PATCH-OUT-OF-ZONE/);
  });
});

describe.skip("spec-0012 prototyping.mode discriminator CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:TC-0012-0475 — normal/boundary: --mode exploration overrides config convergence; default-when-both-absent is convergence; prototyping.json#mode records per-iteration mode; soft gates downgrade while hard schema/path/license (exit 66) stay error", async () => {
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--mode", "exploration", "--target-url", "http://localhost:5173"],
      process.cwd(),
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/exploration/);
  });

  it("QFAI:SPEC-0012:TC-0012-0476 — error: certify against a loop containing an exploration-mode iteration rejects with R-EXPLORATION-CERTIFY-ATTEMPT; acceptedIterationIndex resolves only to a convergence-mode iteration", async () => {
    const r = await runCli(["prototyping", "certify", "--check"], process.cwd());
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/R-EXPLORATION-CERTIFY-ATTEMPT/);
  });
});

describe.skip("spec-0012 taskFidelity keywords CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:TC-0012-0477 — normal: QFAI-CRIT-009 error text names every required keyword (cta_visibility, four_state_check, ...) and the document section; evidence-requirements.md enumerates the same keywords", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/QFAI-CRIT-009/);
    expect(out).toMatch(/cta_visibility/);
    expect(out).toMatch(/four_state_check/);
  });

  it("QFAI:SPEC-0012:TC-0012-0478 — template: iterate --capture emits an evidence template skeleton whose placeholders include every required taskFidelity keyword", async () => {
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--capture", "--target-url", "http://localhost:5173"],
      process.cwd(),
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/cta_visibility/);
    expect(r.stdout).toMatch(/four_state_check/);
  });
});

describe.skip("spec-0012 mutation-log CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:TC-0012-0479 — normal/boundary: a destructive mutation under iter-NN/* (including each file moved by --cycle 0 --force) appends a {ts,caller,path,action,priorSize,newSize} line to mutation-log.jsonl; the log is git-ignored", async () => {
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--force", "--target-url", "http://localhost:5173"],
      process.cwd(),
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/mutation-log\.jsonl/);
  });

  it("QFAI:SPEC-0012:TC-0012-0480 — error: a code path mutating iter-NN evidence without a mutation-log call surfaces R-EVIDENCE-MUTATION-UNLOGGED (error)", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/R-EVIDENCE-MUTATION-UNLOGGED/);
  });
});
