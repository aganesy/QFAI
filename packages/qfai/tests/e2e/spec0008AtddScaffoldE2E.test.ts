/**
 * E2E: spec-0008 CHG-006 — `qfai atdd scaffold --spec spec-NNNN` bulk per-TC
 * skeleton generation. Authored test-first (skip) pending /qfai-implement:
 * the `atdd scaffold` subcommand and the D-SCAFFOLD-PLACEHOLDER escalation
 * do not yet exist, so every `it` is `.skip` and shells out to the CLI
 * binary via a local execFile helper. /qfai-implement removes `.skip` to
 * turn these green.
 */
// QFAI:SPEC-0008:US-0008-0007

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
  it("QFAI:SPEC-0008:US-0008-0007 — scaffold emits one skeleton per TC with framework primitives, a TODO marker, and US/CON-API refs (normal)", async () => {
    // Normal + empty-target special input: against an empty tests/atdd dir,
    // scaffold writes tests/atdd/spec-NNNN/<TC-ID>.test.* per TC, each with
    // `// TODO: implement assertion for <TC-ID>` and related US/CON-API refs.
    const res = await runCli(["atdd", "scaffold", "--spec", "spec-0008", "--format", "text"]);
    expect(res.code).toBe(0);
    expect(res.stdout + res.stderr).toMatch(/TODO: implement assertion for TC-0008/);
  });

  it("QFAI:SPEC-0008:US-0008-0007 — re-running scaffold never overwrites a filled (non-TODO) assertion and D-SCAFFOLD-PLACEHOLDER escalates warning→error after 3 validate cycles (error/boundary/state)", async () => {
    // Idempotency boundary + state escalation: a filled skeleton is not
    // overwritten; an unfilled skeleton retaining its TODO across 3 validate
    // cycles escalates D-SCAFFOLD-PLACEHOLDER from warning to error.
    await runCli(["atdd", "scaffold", "--spec", "spec-0008", "--format", "text"]);
    await runCli(["validate", "--profile", "atdd", "--format", "json"]);
    await runCli(["validate", "--profile", "atdd", "--format", "json"]);
    const third = await runCli(["validate", "--profile", "atdd", "--format", "json"]);
    const body = JSON.parse(third.stdout) as {
      issues: Array<{ code: string; severity: string }>;
    };
    const ph = body.issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(ph?.severity).toBe("error");
  });
});
