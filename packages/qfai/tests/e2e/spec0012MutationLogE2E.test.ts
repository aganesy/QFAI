/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0142
 * (`mutation-log.jsonl`: iterate/certify append a JSON-Lines entry for
 * every destructive mutation under `iter-NN/*`, including each file
 * moved by `--cycle 0 --force`; unlogged mutation surfaces
 * `R-EVIDENCE-MUTATION-UNLOGGED`).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper; the mutation-log behavior is unimplemented so the
 * bodies never execute. Imports nothing from the unbuilt source surface.
 */
// QFAI:SPEC-0012:US-0012-0142

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

describe.skip("spec-0012 US-0012-0142 mutation-log CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:US-0012-0142 — normal/boundary: a destructive mutation under iter-NN/* (including each file moved by --cycle 0 --force) appends a {ts,caller,path,action,priorSize,newSize} line to mutation-log.jsonl", async () => {
    const root = process.cwd();
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--force", "--target-url", "http://localhost:5173"],
      root,
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/mutation-log\.jsonl/);
  });

  it("QFAI:SPEC-0012:US-0012-0142 — error: a code path mutating iter-NN evidence without a mutation-log call surfaces R-EVIDENCE-MUTATION-UNLOGGED (error)", async () => {
    const root = process.cwd();
    const r = await runCli(["validate", "--report"], root);
    expect(r.stdout + r.stderr).toMatch(/R-EVIDENCE-MUTATION-UNLOGGED/);
  });
});
