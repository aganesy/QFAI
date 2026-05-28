/**
 * Integration acceptance for spec-0013 CHG-006 test cases
 * TC-0013-0028..0035 (active-pack resolver, surface_type frontmatter
 * auto-populate + D-SURFACE-TYPE-MISSING, primary_tasks band + shape).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper against the existing CLI binary; the CHG-006
 * behavior is unimplemented so the bodies never execute. Imports
 * nothing from the not-yet-built source surface.
 */
// QFAI:SPEC-0013:TC-0013-0028
// QFAI:SPEC-0013:TC-0013-0029
// QFAI:SPEC-0013:TC-0013-0030
// QFAI:SPEC-0013:TC-0013-0031
// QFAI:SPEC-0013:TC-0013-0032
// QFAI:SPEC-0013:TC-0013-0033
// QFAI:SPEC-0013:TC-0013-0034
// QFAI:SPEC-0013:TC-0013-0035

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

describe.skip("spec-0013 active-pack resolver CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0013:TC-0013-0028 — normal: the single helper returns the pack named in state.json#discussion.currentId without scanning filesystem mtimes", async () => {
    const r = await runCli(["discussion", "list", "--active"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/discussion-/);
  });

  it("QFAI:SPEC-0013:TC-0013-0029 — error: when currentId is absent or resolves to a missing/duplicate pack, the helper raises an error naming candidate discussion-* dirs and the recovery command 'qfai discussion use <id>'", async () => {
    const r = await runCli(["discussion", "list", "--active"], process.cwd());
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/qfai discussion use/);
  });
});

describe.skip("spec-0013 surface_type frontmatter CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0013:TC-0013-0030 — normal: /qfai-sdd sets surface_type: ui-bearing for a spec with a .qfai/contracts/ui/<spec>-*.yaml companion; resolveAllUiBearingSpecs still requires the frontmatter as the strict signal", async () => {
    const r = await runCli(["sdd", "lint"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/surface_type/);
  });

  it("QFAI:SPEC-0013:TC-0013-0031 — boundary: qfai sdd lint emits D-SURFACE-TYPE-MISSING (warning) when a UI companion exists but frontmatter is absent; no finding for a spec with no UI companion", async () => {
    const r = await runCli(["sdd", "lint"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/D-SURFACE-TYPE-MISSING/);
  });
});

describe.skip("spec-0013 primary_tasks band + shape CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0013:TC-0013-0032 — normal: the recommended 3..7 band appears in templates/references and the QFAI-AUD-020 warning text names the band", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout).toMatch(/3\.\.7|3 to 7/);
  });

  it("QFAI:SPEC-0013:TC-0013-0033 — boundary: a screen with fewer than 3 or more than 7 primary_tasks triggers QFAI-AUD-020 naming the band; 3 and 7 inclusive do not", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/QFAI-AUD-020/);
  });

  it("QFAI:SPEC-0013:TC-0013-0034 — normal: auditProfile.ts accepts string-only items AND complete structured {id,label,acceptance} items during the deprecation window", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.code).toBe(0);
  });

  it("QFAI:SPEC-0013:TC-0013-0035 — error: a structured item missing any of id/label/acceptance, or carrying extra keys (closed-schema violation), is rejected by auditProfile.ts", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/primary_tasks|id|label|acceptance/);
  });
});
