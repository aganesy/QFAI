/**
 * Integration: pack-location lint lane — misplaced pack directory case.
 *
 * Covers TC-0004-0071 (AC-0004-0038 / EX-0004-0040).
 *
 * Scenario: a PR diff adds `review-2026-05-27/` at the repository root
 * (outside the allowed roots). The lint script invoked by `pnpm ci:lint`
 * MUST fail, emitting `R-PACK-LOCATION-DRIFT` that references
 * `.agents/rules/root-additions-policy.md` and proposes the correct
 * allowed-root path (`.qfai/review/2026-05-27/`).
 */
// QFAI:SPEC-0004:TC-0004-0071

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileP = promisify(execFile);

const CHECK_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "scripts",
  "check-pack-locations.mjs",
);

async function runCheckScript(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileP(process.execPath, [CHECK_SCRIPT, ...args]);
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

describe("TC-0004-0071: misplaced review-pack at repo root triggers R-PACK-LOCATION-DRIFT", () => {
  it("PR diff adding review-2026-05-27/ at root FAILS with R-PACK-LOCATION-DRIFT naming the correct allowed-root path", async () => {
    // Simulate a PR that introduces a misplaced pack at repo root —
    // `review-2026-05-27/PLAN.md` is outside `.qfai/review/`, the
    // allowed root for review-* packs.
    const changed = ["review-2026-05-27/PLAN.md"].join(",");
    const result = await runCheckScript(["--changed", changed]);

    expect(result.code).not.toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/R-PACK-LOCATION-DRIFT/);
    // References the contributor-facing rule:
    expect(combined).toMatch(/\.agents\/rules\/root-additions-policy\.md/);
    // Names the misplaced directory:
    expect(combined).toMatch(/review-2026-05-27/);
    // Proposes the correct allowed-root path:
    expect(combined).toMatch(/\.qfai\/review\/review-2026-05-27\//);
  });
});
