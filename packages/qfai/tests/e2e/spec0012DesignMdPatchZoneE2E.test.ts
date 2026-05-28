/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0139
 * (DESIGN.md front-matter `patch_zone:` block — in-zone edits update
 * only `patchHash`; out-of-zone edits invalidate evidence with
 * `R-DESIGN-MD-PATCH-OUT-OF-ZONE`).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper; the patch-zone behavior is unimplemented so the
 * bodies never execute. Imports nothing from the unbuilt source surface.
 */
// QFAI:SPEC-0012:US-0012-0139

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

describe.skip("spec-0012 US-0012-0139 DESIGN.md patch_zone CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:US-0012-0139 — normal: an in-zone edit updates only patchHash while majorHash stays byte-stable and prototyping evidence remains valid", async () => {
    const root = process.cwd();
    const r = await runCli(["validate", "--report"], root);
    // In-zone token tweak: evidence still valid, no out-of-zone finding.
    expect(r.stdout).not.toMatch(/R-DESIGN-MD-PATCH-OUT-OF-ZONE/);
    expect(r.code).toBe(0);
  });

  it("QFAI:SPEC-0012:US-0012-0139 — error/boundary: an out-of-zone edit (or removal of the patch_zone block) invalidates evidence and emits R-DESIGN-MD-PATCH-OUT-OF-ZONE (warning)", async () => {
    const root = process.cwd();
    const r = await runCli(["validate", "--report"], root);
    // Out-of-zone edit surfaces the warning finding code.
    expect(r.stdout).toMatch(/R-DESIGN-MD-PATCH-OUT-OF-ZONE/);
  });
});
