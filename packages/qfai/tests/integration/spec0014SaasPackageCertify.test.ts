/**
 * Integration acceptance for spec-0014 CHG-006 test cases
 * TC-0014-0035 (saas-package seal) and TC-0014-0036 (upgrade-scope
 * gating).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper against the existing CLI binary; the saas-package
 * certify scope / `--upgrade-scope` path is unimplemented so the
 * bodies never execute. Imports nothing from the not-yet-built source
 * surface.
 */
// QFAI:SPEC-0014:TC-0014-0035
// QFAI:SPEC-0014:TC-0014-0036

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

describe.skip("spec-0014 saas-package certify CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0014:TC-0014-0035 — normal: certify --scope saas-package against a SaaS-tenant project with complete prototyping evidence and skipped ATDD/implement gates seals a completion-certificate.json with scope: 'saas-package' + non-empty notes naming each skipped gate; does not claim full DONE", async () => {
    const r = await runCli(["prototyping", "certify", "--scope", "saas-package"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/saas-package/);
    expect(r.stdout).toMatch(/notes/);
    expect(r.stdout).not.toMatch(/full DONE/i);
  });

  it("QFAI:SPEC-0014:TC-0014-0036 — error/boundary/state: certify --scope saas-package --upgrade-scope full is rejected (naming still-missing gates) while a gate is missing, then upgrades the certificate to full scope after the gates PASS", async () => {
    const rejected = await runCli(
      ["prototyping", "certify", "--scope", "saas-package", "--upgrade-scope", "full"],
      process.cwd(),
    );
    expect(rejected.code).not.toBe(0);
    expect(rejected.stderr).toMatch(/gate|missing/i);
  });
});
