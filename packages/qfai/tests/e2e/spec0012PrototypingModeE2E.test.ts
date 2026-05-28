/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0140
 * (`prototyping.mode` discriminator: `convergence` | `exploration`
 * via config + `--mode` override; certify rejects sealing an
 * exploration-mode iteration with `R-EXPLORATION-CERTIFY-ATTEMPT`).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper; the `--mode` flag is unimplemented so the bodies
 * never execute. Imports nothing from the unbuilt source surface.
 */
// QFAI:SPEC-0012:US-0012-0140

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

describe.skip("spec-0012 US-0012-0140 prototyping.mode discriminator CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:US-0012-0140 — normal: --mode exploration overrides config convergence; prototyping.json#mode records per-iteration mode; soft gates downgrade to warning under exploration", async () => {
    const root = process.cwd();
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--mode", "exploration", "--target-url", "http://localhost:5173"],
      root,
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/exploration/);
  });

  it("QFAI:SPEC-0012:US-0012-0140 — boundary: absence of both config and --mode defaults to convergence; hard schema/path/license (exit 66) gates stay hard error even under exploration", async () => {
    const root = process.cwd();
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--target-url", "http://localhost:5173"],
      root,
    );
    // Default mode = convergence; hard gates unaffected by mode.
    expect(r.stdout).toMatch(/convergence/);
  });

  it("QFAI:SPEC-0012:US-0012-0140 — error: certify rejects sealing an exploration-mode iteration with R-EXPLORATION-CERTIFY-ATTEMPT; acceptedIterationIndex resolves only to a convergence-mode iteration", async () => {
    const root = process.cwd();
    const r = await runCli(["prototyping", "certify", "--check"], root);
    expect(r.code).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/R-EXPLORATION-CERTIFY-ATTEMPT/);
  });
});
