/**
 * E2E acceptance for spec-0013 CHG-006 user stories US-0013-0012,
 * US-0013-0013, US-0013-0014:
 *   - US-0013-0012: resolve the active discussion pack via a single
 *     helper reading `.qfai/state.json#discussion.currentId` (no mtime
 *     guessing; clear recovery error on ambiguity/absence).
 *   - US-0013-0013: `/qfai-sdd` auto-populates `surface_type: ui-bearing`
 *     frontmatter; `qfai sdd lint` warns D-SURFACE-TYPE-MISSING.
 *   - US-0013-0014: `primary_tasks` 3..7 count band + accepted
 *     string-only / structured shapes.
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI via a local
 * `execFile` helper; the active-pointer reader / auto-populate /
 * band-shape behavior is unimplemented so the bodies never execute.
 * Imports nothing from the not-yet-built source surface.
 */
// QFAI:SPEC-0013:US-0013-0012
// QFAI:SPEC-0013:US-0013-0013
// QFAI:SPEC-0013:US-0013-0014

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

describe.skip("spec-0013 US-0013-0012 active-pack resolver CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0013:US-0013-0012 — normal: the resolver returns the pack named in state.json#discussion.currentId without scanning filesystem mtimes", async () => {
    const r = await runCli(["discussion", "list", "--active"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/discussion-/);
  });

  it("QFAI:SPEC-0013:US-0013-0012 — error: absent/duplicate currentId raises a recovery error naming candidate discussion-* dirs and the recovery command 'qfai discussion use <id>'", async () => {
    const r = await runCli(["discussion", "list", "--active"], process.cwd());
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/qfai discussion use/);
  });
});

describe.skip("spec-0013 US-0013-0013 surface_type auto-populate CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0013:US-0013-0013 — normal: /qfai-sdd sets surface_type: ui-bearing frontmatter for a spec with a .qfai/contracts/ui/<spec>-*.yaml companion (resolveAllUiBearingSpecs still requires the frontmatter)", async () => {
    const r = await runCli(["sdd", "lint"], process.cwd());
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/surface_type/);
  });

  it("QFAI:SPEC-0013:US-0013-0013 — boundary/error: qfai sdd lint emits D-SURFACE-TYPE-MISSING (warning) when a UI companion exists but the frontmatter is absent; no finding when no UI companion exists", async () => {
    const r = await runCli(["sdd", "lint"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/D-SURFACE-TYPE-MISSING/);
  });
});

describe.skip("spec-0013 US-0013-0014 primary_tasks band + shape CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0013:US-0013-0014 — normal: structured {id,label,acceptance} primary_tasks are accepted and the recommended 3..7 band is documented and named in the QFAI-AUD-020 warning", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout).toMatch(/3\.\.7|3 to 7/);
  });

  it("QFAI:SPEC-0013:US-0013-0014 — error/boundary: a count below 3 or above 7 triggers QFAI-AUD-020 (3 and 7 inclusive do not); incomplete/open structured items are rejected", async () => {
    const r = await runCli(["validate", "--report"], process.cwd());
    expect(r.stdout + r.stderr).toMatch(/QFAI-AUD-020/);
  });
});
