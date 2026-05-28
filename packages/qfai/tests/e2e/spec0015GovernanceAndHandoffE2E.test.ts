/**
 * E2E acceptance for spec-0015 CHG-006 user stories US-0015-0009..0015:
 *   - US-0015-0009: SKILL.md `## Default Autopilot Policy` section /
 *     R-AUTOPILOT-POLICY-MISSING.
 *   - US-0015-0010: envelope-deviation AskUserQuestion audit-log
 *     decision record.
 *   - US-0015-0011: canonical cross-skill handoff schema /
 *     R-HANDOFF-SCHEMA-DRIFT.
 *   - US-0015-0012: eight-code Reviewer-Gate finding catalog (mandatory
 *     non-empty justification).
 *   - US-0015-0013: `qfai audit log` CLI surface.
 *   - US-0015-0014: `qfai handoff upgrade` legacy adapter.
 *   - US-0015-0015: cross-skill documentation realignment / zero stale
 *     references.
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper; the governance / handoff / audit behavior is
 * unimplemented so the bodies never execute. Imports nothing from the
 * not-yet-built source surface.
 */
// QFAI:SPEC-0015:US-0015-0009
// QFAI:SPEC-0015:US-0015-0010
// QFAI:SPEC-0015:US-0015-0011
// QFAI:SPEC-0015:US-0015-0012
// QFAI:SPEC-0015:US-0015-0013
// QFAI:SPEC-0015:US-0015-0014
// QFAI:SPEC-0015:US-0015-0015

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

describe.skip("spec-0015 US-0015-0009 autopilot policy CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:US-0015-0009 — error/normal: a SKILL.md missing ## Default Autopilot Policy emits R-AUTOPILOT-POLICY-MISSING (error); a SKILL.md naming all three buckets (auto-decide/ask-user/hard-required) passes", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/R-AUTOPILOT-POLICY-MISSING/);
  });
});

describe.skip("spec-0015 US-0015-0010 envelope audit-log CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:US-0015-0010 — normal: an AskUserQuestion naming one of the four envelope-deviation contexts writes .qfai/evidence/decisions/<ISO>.json; a non-envelope question writes no record (no fail-open)", async () => {
    const r = await runCli(["audit", "log"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/envelopeContractClause|scope/);
  });
});

describe.skip("spec-0015 US-0015-0011 handoff schema CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:US-0015-0011 — error/boundary: a non-conforming handoff write (or asymmetric SSOT-sync Pair IV edit) emits R-HANDOFF-SCHEMA-DRIFT (error); a conforming handoff with extra keys passes and a legacy file warns", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/R-HANDOFF-SCHEMA-DRIFT/);
  });
});

describe.skip("spec-0015 US-0015-0012 finding-code catalog CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:US-0015-0012 — normal/error: all eight catalog codes are registered at severity error and each requires a mandatory non-empty justification; an empty justification is rejected by validate", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/R-AUTOPILOT-POLICY-MISSING/);
    expect(out).toMatch(/R-HANDOFF-SCHEMA-DRIFT/);
    expect(out).toMatch(/justification/);
  });
});

describe.skip("spec-0015 US-0015-0013 audit log CLI CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:US-0015-0013 — normal: qfai audit log lists decision records newest-first with --scope/--operator/--clause filters and --format table|json (table default); empty store yields an empty result without error", async () => {
    const r = await runCli(["audit", "log", "--format", "json"], process.cwd());
    expect(r.code).toBe(0);
  });

  it("QFAI:SPEC-0015:US-0015-0013 — error: an unknown --scope/--operator value or malformed --clause filter is rejected with a clear message (not silently empty)", async () => {
    const r = await runCli(["audit", "log", "--scope", "not-a-real-scope"], process.cwd());
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/scope|invalid|unknown/i);
  });
});

describe.skip("spec-0015 US-0015-0014 handoff upgrade CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:US-0015-0014 — normal/error: qfai handoff upgrade <legacy-file> emits a conforming handoff.yaml preserving all original fields under legacy:; a malformed legacy input errors without overwriting or partially emitting the canonical file", async () => {
    const r = await runCli(["handoff", "upgrade", "session-handoff.yaml"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/handoff\.yaml|legacy/);
  });
});

describe.skip("spec-0015 US-0015-0015 doc realignment CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0015:US-0015-0015 — normal/error: validate --report reports zero stale references for an in-PR doc rewrite, and flags a stale reference (warning in window, error at sunset)", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout).toMatch(/stale reference|stale references/i);
  });
});
