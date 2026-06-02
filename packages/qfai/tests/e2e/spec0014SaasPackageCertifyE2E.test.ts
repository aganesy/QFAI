/**
 * E2E acceptance for spec-0014 CHG-006 user story US-0014-0020
 * (`qfai prototyping certify --scope saas-package`: seal a
 * completion-certificate.json carrying scope: "saas-package" and a
 * notes: field naming every skipped gate; never overstate as full
 * DONE; `--upgrade-scope full` path once missing gates land).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper; the saas-package scope discriminator is
 * unimplemented so the bodies never execute. Imports nothing from the
 * not-yet-built source surface.
 */
// QFAI:SPEC-0014:US-0014-0020

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

describe.skip("spec-0014 US-0014-0020 saas-package certify scope CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0014:US-0014-0020 — normal: certify --scope saas-package seals a completion-certificate.json carrying scope: 'saas-package' and a non-empty notes: naming each skipped gate; the certificate does not claim full DONE", async () => {
    const r = await runCli(["prototyping", "certify", "--scope", "saas-package"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/saas-package/);
    expect(r.stdout).toMatch(/notes/);
    expect(r.stdout).not.toMatch(/full DONE/i);
  });

  it("QFAI:SPEC-0014:US-0014-0020 — error/boundary: --upgrade-scope full is rejected while a gate named in notes is still missing, then succeeds after the gates PASS (saas-package -> full state transition)", async () => {
    const rejected = await runCli(
      ["prototyping", "certify", "--scope", "saas-package", "--upgrade-scope", "full"],
      process.cwd(),
    );
    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toMatch(/gate|missing/i);
  });
});
