/**
 * E2E: spec-0010 CHG-006 — the `qfai discussion` command, exercised
 * through the built CLI binary against deterministic temp fixtures.
 * `discussion use <id>` writes the active-session pointer; `discussion
 * list --active` reads it back (NOT mtime), and an absent pointer with
 * multiple candidate dirs yields a recovery error naming the candidates
 * and `qfai discussion use <id>`.
 *
 * Requires a built dist (pnpm --filter qfai build) so dist/cli/index.cjs
 * reflects the wired `discussion` command.
 */
// QFAI:SPEC-0010:US-0010-0011
// QFAI:SPEC-0010:US-0010-0012

import { execFile } from "node:child_process";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { removeTempTree } from "../helpers/tempTree.js";

const execFileP = promisify(execFile);

const CLI_PATH = path.resolve(__dirname, "..", "..", "dist", "cli", "index.cjs");

async function runCli(
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileP(process.execPath, [CLI_PATH, ...args], { cwd });
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

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0010-e2e-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

async function makePack(id: string): Promise<void> {
  await mkdir(path.join(root, ".qfai", "discussion", id), { recursive: true });
}

describe("spec-0010 discussion active pointer CHG-006 (built CLI)", () => {
  it("QFAI:SPEC-0010:US-0010-0012 — `discussion use` then `discussion list --active` round-trips the currentId (normal/state)", async () => {
    await makePack("discussion-20260527075558258");
    const used = await runCli(
      ["discussion", "use", "discussion-20260527075558258", "--root", root],
      root,
    );
    expect(used.code).toBe(0);

    const res = await runCli(
      ["discussion", "list", "--active", "--format", "json", "--root", root],
      root,
    );
    expect(res.code).toBe(0);
    const body = JSON.parse(res.stdout) as { currentId?: string };
    expect(body.currentId).toBe("discussion-20260527075558258");
  });

  it("QFAI:SPEC-0010:US-0010-0012 — absent currentId with multiple candidates → recovery error names candidates + `qfai discussion use` (error/boundary)", async () => {
    await makePack("discussion-20260101000000000");
    await makePack("discussion-20260202000000000");
    const res = await runCli(
      ["discussion", "list", "--active", "--format", "json", "--root", root],
      root,
    );
    expect(res.code).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/qfai discussion use/);
    expect(res.stdout + res.stderr).toMatch(/discussion-20260202000000000/);
  });
});
