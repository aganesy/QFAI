/**
 * The re-pin scripts say what is missing when dependencies are not installed.
 *
 * A checkout with no `node_modules` made them end in a module-not-found stack that names neither
 * the cause nor the fix, and the two scripts are run back to back, so the second one's failure was
 * easy to read as a run that had nothing to change.
 *
 * The scripts are copied into a temporary directory, where nothing above them holds a
 * `node_modules`, so the dependencies they load cannot resolve.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

let bare: string;

beforeEach(async () => {
  bare = await mkdtemp(path.join(os.tmpdir(), "qfai-repin-bare-"));
  for (const rel of [".github", "scripts"]) {
    await cp(path.join(repoRoot, rel), path.join(bare, rel), { recursive: true });
  }
});

afterEach(async () => {
  await removeTempTree(bare);
});

function run(script: string): { status: number | null; stderr: string } {
  const { status, stderr } = spawnSync(process.execPath, [path.join(bare, script)], {
    cwd: bare,
    encoding: "utf-8",
  });
  return { status, stderr };
}

describe("the re-pin scripts without installed dependencies", () => {
  it.each(["scripts/pin-guard-bytes.mjs", "scripts/pin-verification-bodies.mjs"])(
    "%s exits 1 with one line naming the fix",
    (script) => {
      const result = run(script);

      expect(result.status).toBe(1);
      expect(result.stderr.trim().split("\n")).toHaveLength(1);
      expect(result.stderr).toContain("pnpm install");
      expect(result.stderr).toContain("yaml");
    },
  );
});
