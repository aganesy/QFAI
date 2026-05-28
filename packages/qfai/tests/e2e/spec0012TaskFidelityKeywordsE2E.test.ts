/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0141
 * (`QFAI-CRIT-009` taskFidelity keyword surfacing: error text names
 * every required keyword, evidence-requirements.md enumerates them,
 * and `iterate --capture` emits a keyword-placeholder template).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper; the keyword-naming behavior is unimplemented so
 * the bodies never execute. Imports nothing from the unbuilt surface.
 */
// QFAI:SPEC-0012:US-0012-0141

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

describe.skip("spec-0012 US-0012-0141 taskFidelity keywords CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:US-0012-0141 — normal/error: QFAI-CRIT-009 error text names every required keyword (cta_visibility, four_state_check, ...) when taskFidelity evidence omits them", async () => {
    const root = process.cwd();
    const r = await runCli(["validate", "--report"], root);
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/QFAI-CRIT-009/);
    expect(out).toMatch(/cta_visibility/);
    expect(out).toMatch(/four_state_check/);
  });

  it("QFAI:SPEC-0012:US-0012-0141 — boundary: iterate --capture emits an evidence template skeleton whose placeholders include every required taskFidelity keyword", async () => {
    const root = process.cwd();
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--capture", "--target-url", "http://localhost:5173"],
      root,
    );
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/cta_visibility/);
    expect(r.stdout).toMatch(/four_state_check/);
  });
});
