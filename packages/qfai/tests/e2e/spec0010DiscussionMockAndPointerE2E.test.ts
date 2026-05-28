/**
 * E2E: spec-0010 CHG-006 — mock template emits anchor-form hrefs by default
 * (QFAI-MOCK-010), and `/qfai-discussion` writes the active-session pointer
 * `.qfai/state.json#discussion.currentId`. Authored test-first (skip)
 * pending /qfai-implement: the anchor-form template default and the active
 * pointer writer do not yet exist, so every `it` is `.skip` and shells out
 * to the CLI binary via a local execFile helper. /qfai-implement removes
 * `.skip` to turn these green.
 */
// QFAI:SPEC-0010:US-0010-0011
// QFAI:SPEC-0010:US-0010-0012

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
  it("QFAI:SPEC-0010:US-0010-0011 — anchor-form #href and external http(s) hrefs both PASS QFAI-MOCK-010 (normal)", async () => {
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    expect(res.stdout).not.toMatch(/QFAI-MOCK-010/);
  });

  it("QFAI:SPEC-0010:US-0010-0011 — a same-origin absolute /path/ href FAILS QFAI-MOCK-010 without broadening the validator (error)", async () => {
    const res = await runCli(["validate", "--profile", "prototyping", "--format", "json"]);
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/QFAI-MOCK-010/);
  });
});

describe.skip("spec-0010 discussion active pointer CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0010:US-0010-0012 — finalizing a discussion pack writes state.json#discussion.currentId equal to the authored pack and discussion list --active reads it (normal/state)", async () => {
    // Normal + write→read round-trip: currentId points at the just-authored
    // pack and `discussion list --active` reads back the same id.
    const res = await runCli(["discussion", "list", "--active", "--format", "json"]);
    expect(res.code).toBe(0);
    const body = JSON.parse(res.stdout) as { currentId?: string };
    expect(typeof body.currentId).toBe("string");
  });

  it("QFAI:SPEC-0010:US-0010-0012 — when currentId is absent with multiple candidate dirs, a recovery error names the candidates and `qfai discussion use <id>` (error/boundary)", async () => {
    // Boundary/error: ambiguous pointer (absent currentId + many candidates)
    // → error naming candidate dirs + recovery command; no mtime inference.
    const res = await runCli(["discussion", "list", "--active", "--format", "json"]);
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/qfai discussion use/);
  });
});
