/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0138
 * (`qfai prototyping iterate --cycle 0 --emit-skeletons` cross-spec
 * coverage of the frozen surface union).
 *
 * Authored test-first (red): every `it` is `.skip`d pending
 * `/qfai-implement`. Bodies shell out to the CLI binary via a local
 * `execFile` helper; the `--emit-skeletons` / `--skeleton-mode` flags
 * do not exist yet, so the bodies are intentionally never executed.
 * `/qfai-implement` removes `.skip` to turn these green. The file
 * imports nothing from the not-yet-built source surface.
 */
// QFAI:SPEC-0012:US-0012-0138

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

describe.skip("spec-0012 US-0012-0138 emit-skeletons coverage CHG-006 (test-first, pending /qfai-implement)", () => {
  it("QFAI:SPEC-0012:US-0012-0138 — normal: --cycle 0 --emit-skeletons writes one placeholder HTML per frozenSurfaceUnion screen and every union screen carries screenshot+html evidenceRefs cross-spec", async () => {
    const root = process.cwd();
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--emit-skeletons", "--target-url", "http://localhost:5173"],
      root,
    );
    expect(r.code).toBe(0);
    // Each frozenSurfaceUnion screen acquires both kinds post-convergence.
    expect(r.stdout).toMatch(/screenshot/);
    expect(r.stdout).toMatch(/html/);
  });

  it("QFAI:SPEC-0012:US-0012-0138 — boundary: --emit-skeletons ABSENT preserves v1.9.1 behavior with zero skeleton files (no regression)", async () => {
    const root = process.cwd();
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--target-url", "http://localhost:5173"],
      root,
    );
    expect(r.code).toBe(0);
    // No skeleton HTML emitted when the opt-in flag is absent.
    expect(r.stdout).not.toMatch(/emit-skeletons|skeleton placeholder/i);
  });

  it("QFAI:SPEC-0012:US-0012-0138 — error: a union screen with no resolvable DESIGN.md token / write failure mid-emit exits non-zero naming the offending screen", async () => {
    const root = process.cwd();
    const r = await runCli(
      ["prototyping", "iterate", "--cycle", "0", "--emit-skeletons", "--target-url", "http://localhost:5173"],
      root,
    );
    // Error path: unresolvable token surfaces a non-zero exit and names the screen.
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/screen/i);
  });
});
