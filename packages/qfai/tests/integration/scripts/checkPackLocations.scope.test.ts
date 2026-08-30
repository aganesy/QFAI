/**
 * Integration: pack-location lint lane — untouched legacy packs are
 * out of scope (staged/changed-dir scope per DR-0274).
 *
 * Covers TC-0004-0073 (AC-0004-0039 / EX-0004-0041).
 *
 * Scenario: a PR touches NO pack directory while a pre-existing legacy
 * `review-old/` exists untouched at the repository root. The lane MUST
 * pass silently — the untouched legacy pack is not re-flagged because
 * scope is the staged/changed paths only, not a full-tree walk.
 */
// QFAI:SPEC-0004:TC-0004-0073

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { removeTempTree } from "../../helpers/tempTree.js";

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
  cwd: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileP(process.execPath, [CHECK_SCRIPT, ...args], { cwd });
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

let fixtureRoot: string;

beforeEach(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-pack-location-scope-"));
  // Seed a pre-existing legacy pack untouched by the simulated PR.
  // Per DR-0274 the scope is the staged/changed-paths list, NOT a
  // full-tree walk, so the script must NOT inspect this directory when
  // it is not part of the change list.
  const legacy = path.join(fixtureRoot, "review-old");
  await mkdir(legacy, { recursive: true });
  await writeFile(path.join(legacy, "stale.md"), "legacy untouched pack\n", "utf-8");
});

afterEach(async () => {
  await removeTempTree(fixtureRoot);
});

describe("TC-0004-0073: untouched legacy review-old/ is NOT re-flagged (scope = staged/changed paths)", () => {
  it("a PR with only unrelated edits PASSes even though an untouched legacy review-old/ exists at root", async () => {
    // The PR only touches a non-pack file. The legacy `review-old/` is
    // on disk in the fixture but is NOT part of the change list, so it
    // must NOT be flagged.
    const changed = ["docs/guide.md", "src/index.ts"].join(",");
    const result = await runCheckScript(fixtureRoot, ["--changed", changed]);

    expect(result.code).toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).not.toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(combined).not.toMatch(/review-old/);
  });

  it("an empty change set PASSes silently (no pack dirs touched at all)", async () => {
    const result = await runCheckScript(fixtureRoot, ["--changed", ""]);

    expect(result.code).toBe(0);
    expect(result.stdout + result.stderr).not.toMatch(/R-PACK-LOCATION-DRIFT/);
  });
});
