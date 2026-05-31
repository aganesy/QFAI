/**
 * Integration: pack-location lint lane — allowed-root pack passes
 * silently.
 *
 * Covers TC-0004-0072 (AC-0004-0039 / EX-0004-0041).
 *
 * Scenario: a PR diff adds `.qfai/discussion/discussion-20260527075558258/`
 * (under an allowed root) plus an unrelated README edit. The lane MUST
 * pass with exit code 0 and emit no `R-PACK-LOCATION-DRIFT` finding.
 */
// QFAI:SPEC-0004:TC-0004-0072

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

describe("TC-0004-0072: allowed-root discussion pack passes the lane silently", () => {
  it("PR diff adding .qfai/discussion/discussion-20260527075558258/ plus an unrelated README edit PASSes", async () => {
    const changed = [
      ".qfai/discussion/discussion-20260527075558258/index.md",
      ".qfai/discussion/discussion-20260527075558258/draft.md",
      "README.md",
    ].join(",");
    const result = await runCheckScript(["--changed", changed]);

    expect(result.code).toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).not.toMatch(/R-PACK-LOCATION-DRIFT/);
  });

  it("PR diff adding .qfai/review/review-2026-05-27/ (review-* under its allowed root) PASSes", async () => {
    // Symmetric coverage: review-* under .qfai/review/ is an allowed root.
    const changed = [".qfai/review/review-2026-05-27/findings.md"].join(",");
    const result = await runCheckScript(["--changed", changed]);

    expect(result.code).toBe(0);
    expect(result.stdout + result.stderr).not.toMatch(/R-PACK-LOCATION-DRIFT/);
  });
});
