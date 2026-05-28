/**
 * Integration: spec-0010 CHG-006 — mock anchor-form href validation
 * (QFAI-MOCK-010 anchor/external PASS, same-origin /path/ FAIL,
 * template↔validator asymmetry R-MOCK-HREF-DRIFT) and the discussion
 * active-session pointer (currentId round-trip + ambiguous/absent recovery
 * error). Authored test-first (skip) pending /qfai-implement: the
 * anchor-form template default and the active pointer writer do not yet
 * exist, so every `it` is `.skip` and shells out to the CLI binary via a
 * local execFile helper.
 */
// QFAI:SPEC-0010:TC-0010-0009
// QFAI:SPEC-0010:TC-0010-0010
// QFAI:SPEC-0010:TC-0010-0011
// QFAI:SPEC-0010:TC-0010-0012
// QFAI:SPEC-0010:TC-0010-0013

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

describe.skip("spec-0010 mock anchor-form hrefs CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0010:TC-0010-0009 — #anchor and external http(s) hrefs both PASS QFAI-MOCK-010; SKILL.md instructs anchor-form (normal)", async () => {
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    expect(res.stdout).not.toMatch(/QFAI-MOCK-010/);
  });

  it("QFAI:SPEC-0010:TC-0010-0010 — same-origin absolute /path/ href FAILS QFAI-MOCK-010; validator not broadened to accept /path/ (error)", async () => {
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/QFAI-MOCK-010/);
  });

  it("QFAI:SPEC-0010:TC-0010-0011 — template edited to /path/ form while validator stays strict (asymmetric) fires Reviewer-Gate R-MOCK-HREF-DRIFT at error severity (error)", async () => {
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    const body = JSON.parse(res.stdout) as { issues: Array<{ code: string; severity: string }> };
    const drift = body.issues.find((i) => i.code === "R-MOCK-HREF-DRIFT");
    expect(drift?.severity).toBe("error");
  });
});

describe.skip("spec-0010 discussion active pointer CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0010:TC-0010-0012 — finalized pack sets state.json#discussion.currentId to the authored pack ID; discussion list --active reads it (normal)", async () => {
    const res = await runCli(["discussion", "list", "--active", "--format", "json"]);
    expect(res.code).toBe(0);
    const body = JSON.parse(res.stdout) as { currentId?: string };
    expect(typeof body.currentId).toBe("string");
  });

  it("QFAI:SPEC-0010:TC-0010-0013 — absent currentId with multiple candidate dirs yields a recovery error naming candidates + `qfai discussion use <id>`; no mtime inference (boundary)", async () => {
    const res = await runCli(["discussion", "list", "--active", "--format", "json"]);
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/qfai discussion use/);
  });
});
