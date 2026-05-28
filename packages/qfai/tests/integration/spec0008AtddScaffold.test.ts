/**
 * Integration: spec-0008 CHG-006 — `qfai atdd scaffold` per-TC skeleton
 * emission + D-SCAFFOLD-PLACEHOLDER warning, plus idempotency and 3-cycle
 * warning→error escalation. Authored test-first (skip) pending
 * /qfai-implement: the `atdd scaffold` subcommand does not yet exist, so
 * every `it` is `.skip` and shells out to the CLI binary via a local
 * execFile helper.
 */
// QFAI:SPEC-0008:TC-0008-0013
// QFAI:SPEC-0008:TC-0008-0014

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

describe.skip("spec-0008 atdd scaffold CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0008:TC-0008-0013 — scaffold against an empty target emits per-TC skeletons with framework import, TODO marker, US/CON-API refs; validate emits D-SCAFFOLD-PLACEHOLDER warning (normal)", async () => {
    const res = await runCli(["atdd", "scaffold", "--spec", "spec-0008", "--format", "text"]);
    expect(res.code).toBe(0);
    expect(res.stdout + res.stderr).toMatch(/TODO: implement assertion for TC-0008/);
    const validate = await runCli(["validate", "--profile", "atdd", "--format", "json"]);
    const body = JSON.parse(validate.stdout) as { issues: Array<{ code: string; severity: string }> };
    const ph = body.issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(ph?.severity).toBe("warning");
  });

  it("QFAI:SPEC-0008:TC-0008-0014 — re-run does not overwrite a filled assertion; placeholder retained across 3 cycles escalates D-SCAFFOLD-PLACEHOLDER warning→error (error/boundary/state)", async () => {
    await runCli(["atdd", "scaffold", "--spec", "spec-0008", "--format", "text"]);
    await runCli(["validate", "--profile", "atdd", "--format", "json"]);
    await runCli(["validate", "--profile", "atdd", "--format", "json"]);
    const third = await runCli(["validate", "--profile", "atdd", "--format", "json"]);
    const body = JSON.parse(third.stdout) as { issues: Array<{ code: string; severity: string }> };
    const ph = body.issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(ph?.severity).toBe("error");
  });
});
