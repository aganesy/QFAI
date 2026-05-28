/**
 * Integration acceptance for spec-0015 CHG-006 test cases
 * TC-0015-0020..0033 (autopilot policy gate, envelope-deviation
 * audit-log, handoff schema drift, eight-code finding catalog,
 * `qfai audit log` CLI, `qfai handoff upgrade` legacy adapter, doc
 * realignment / stale-reference report).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper against the existing CLI binary; the CHG-006
 * behavior is unimplemented so the bodies never execute. Imports
 * nothing from the not-yet-built source surface.
 */
// QFAI:SPEC-0015:TC-0015-0020
// QFAI:SPEC-0015:TC-0015-0021
// QFAI:SPEC-0015:TC-0015-0022
// QFAI:SPEC-0015:TC-0015-0023
// QFAI:SPEC-0015:TC-0015-0024
// QFAI:SPEC-0015:TC-0015-0025
// QFAI:SPEC-0015:TC-0015-0026
// QFAI:SPEC-0015:TC-0015-0027
// QFAI:SPEC-0015:TC-0015-0028
// QFAI:SPEC-0015:TC-0015-0029
// QFAI:SPEC-0015:TC-0015-0030
// QFAI:SPEC-0015:TC-0015-0031
// QFAI:SPEC-0015:TC-0015-0032
// QFAI:SPEC-0015:TC-0015-0033

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

describe.skip("spec-0015 autopilot policy CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:TC-0015-0020 — error: a SKILL.md lacking ## Default Autopilot Policy makes the Reviewer Gate emit R-AUTOPILOT-POLICY-MISSING (error) with a non-empty justification naming the SKILL.md path and the absent section", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/R-AUTOPILOT-POLICY-MISSING/);
  });

  it("QFAI:SPEC-0015:TC-0015-0021 — normal: a SKILL.md whose ## Default Autopilot Policy lists all three buckets passes without R-AUTOPILOT-POLICY-MISSING; widening the auto-decide bucket beyond the DR-0269 set is flagged", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout).not.toMatch(/R-AUTOPILOT-POLICY-MISSING/);
    expect(r.code).toBe(0);
  });
});

describe.skip("spec-0015 envelope audit-log CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:TC-0015-0022 — normal: an AskUserQuestion naming one of the four envelope-deviation contexts writes .qfai/evidence/decisions/<ISO>.json shaped {question,answer,scope,operatorIdentity,timestamp,envelopeContractClause}", async () => {
    const r = await runCli(["audit", "log", "--format", "json"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/envelopeContractClause/);
  });

  it("QFAI:SPEC-0015:TC-0015-0023 — boundary: an AskUserQuestion naming none of the four contexts writes no decision record, and .qfai/evidence/decisions/ is git-ignored by default", async () => {
    const r = await runCli(["audit", "log", "--format", "json"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/\[\]|no records/i);
  });
});

describe.skip("spec-0015 handoff schema CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:TC-0015-0024 — error: a non-conforming handoff write (or asymmetric SSOT-sync Pair IV edit) makes the Reviewer Gate emit R-HANDOFF-SCHEMA-DRIFT (error) with a non-empty justification", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/R-HANDOFF-SCHEMA-DRIFT/);
  });

  it("QFAI:SPEC-0015:TC-0015-0025 — normal/boundary: a handoff.yaml matching the minimum field set plus extra per-skill keys passes (additionalProperties: true); a legacy session-handoff.yaml read in-window surfaces D-HANDOFF-LEGACY-FORMAT (warning) not R-HANDOFF-SCHEMA-DRIFT", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/D-HANDOFF-LEGACY-FORMAT/);
  });
});

describe.skip("spec-0015 finding-code catalog CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:TC-0015-0026 — normal: the eight catalog codes are registered at severity error (R-DESIGN-MD-PATCH-OUT-OF-ZONE documented warning) and each requires a mandatory non-empty justification", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/R-AUTOPILOT-POLICY-MISSING/);
    expect(out).toMatch(/R-EVIDENCE-MUTATION-UNLOGGED/);
    expect(out).toMatch(/R-MOCK-HREF-DRIFT/);
  });

  it("QFAI:SPEC-0015:TC-0015-0027 — error: a Reviewer report emitting a catalog code with empty/whitespace-only justification is rejected by qfai validate ingestion; the same code with a non-empty justification is accepted", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/justification/);
  });
});

describe.skip("spec-0015 audit log CLI CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:TC-0015-0028 — normal: qfai audit log lists decision records newest-first; --scope/--operator/--clause filter the set and --format json emits JSON", async () => {
    const r = await runCli(["audit", "log", "--scope", "skill-envelope", "--format", "json"], process.cwd());
    expect(r.code).toBe(0);
  });

  it("QFAI:SPEC-0015:TC-0015-0029 — boundary: qfai audit log with no --format defaults to table, and an empty/absent .qfai/evidence/decisions/ directory yields an empty result without error", async () => {
    const r = await runCli(["audit", "log"], process.cwd());
    expect(r.code).toBe(0);
  });
});

describe.skip("spec-0015 handoff upgrade CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:TC-0015-0030 — normal: qfai handoff upgrade <legacy-file> emits a conforming handoff.yaml at the canonical path with recognized fields mapped and all original fields preserved under a legacy: key", async () => {
    const r = await runCli(["handoff", "upgrade", "session-handoff.yaml"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/handoff\.yaml|legacy/);
  });

  it("QFAI:SPEC-0015:TC-0015-0031 — error: qfai handoff upgrade on a malformed/unreadable legacy file fails with a clear error and does not overwrite or partially emit a canonical handoff.yaml", async () => {
    const r = await runCli(["handoff", "upgrade", "malformed-legacy.yaml"], process.cwd());
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/malformed|unreadable|invalid/i);
  });
});

describe.skip("spec-0015 stale-ref report CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:TC-0015-0032 — normal: when references/*.md + SKILL.md are rewritten in the same atomic PR as the implementation, validate --report reports zero stale references at HEAD", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/0 stale|zero stale/i);
  });

  it("QFAI:SPEC-0015:TC-0015-0033 — error: a references/*.md still describing pre-implementation behavior surfaces as a warning during the window and fails (error) at HEAD after sunset", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/stale reference/i);
  });
});
