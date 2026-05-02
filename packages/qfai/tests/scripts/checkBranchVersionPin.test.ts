/**
 * Spawn-based tests for `scripts/check-branch-version-pin.sh`.
 *
 * The guard's contract:
 *   - Branch name has SemVer that matches package.json#version  -> exit 0
 *   - Branch name has SemVer that disagrees with package.json   -> exit 1
 *   - Branch name has no SemVer (main, chore/*, etc.)            -> exit 0 (skip)
 *   - VERSION_PIN_SKIP=1 overrides everything                   -> exit 0
 *
 * The tests read the live `packages/qfai/package.json#version` and
 * derive matching / mismatching branch names from it, so they remain
 * stable regardless of which release the repo currently sits at.
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(PKG_ROOT, "scripts/check-branch-version-pin.sh");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(env: Record<string, string>): RunResult {
  const child = spawnSync("bash", [SCRIPT], {
    env: {
      ...process.env,
      // Always clear inherited GitHub-related env so each test controls them.
      GITHUB_HEAD_REF: "",
      GITHUB_REF_NAME: "",
      VERSION_PIN_SKIP: "0",
      ...env,
    },
    encoding: "utf-8",
  });
  return {
    status: child.status,
    stdout: child.stdout ?? "",
    stderr: child.stderr ?? "",
  };
}

async function readCurrentVersion(): Promise<string> {
  const text = await readFile(path.join(PKG_ROOT, "package.json"), "utf-8");
  return JSON.parse(text).version as string;
}

describe("check-branch-version-pin.sh", () => {
  it("passes when branch SemVer matches package.json#version", async () => {
    const v = await readCurrentVersion();
    const r = runGuard({ GITHUB_REF_NAME: `feature/v${v}` });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(new RegExp(`pinned to ${v.replace(/\./g, "\\.")}`));
  });

  it("passes for release/X.Y.Z naming style", async () => {
    const v = await readCurrentVersion();
    const r = runGuard({ GITHUB_REF_NAME: `release/${v}` });
    expect(r.status).toBe(0);
  });

  it("passes when extra suffix follows the SemVer (first match wins)", async () => {
    const v = await readCurrentVersion();
    const r = runGuard({ GITHUB_REF_NAME: `feature/v${v}-bugfix-x` });
    expect(r.status).toBe(0);
  });

  it("fails when branch SemVer disagrees with package.json#version", () => {
    // 9.99.99 cannot collide with any real release we'd be on.
    const r = runGuard({ GITHUB_REF_NAME: "feature/v9.99.99" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/branch version pin mismatch/);
    expect(r.stderr).toMatch(/feature\/v9\.99\.99/);
    expect(r.stderr).toMatch(/version-discipline\.md/);
  });

  it("skips when branch has no SemVer (main)", () => {
    const r = runGuard({ GITHUB_REF_NAME: "main" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no SemVer pin/);
  });

  it("skips when branch has no SemVer (chore/deps)", () => {
    const r = runGuard({ GITHUB_REF_NAME: "chore/update-deps" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no SemVer pin/);
  });

  it("honors VERSION_PIN_SKIP=1 even on mismatch", () => {
    const r = runGuard({
      GITHUB_REF_NAME: "feature/v9.99.99",
      VERSION_PIN_SKIP: "1",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/skipping/);
  });

  it("prefers GITHUB_HEAD_REF over GITHUB_REF_NAME (PR context)", async () => {
    const v = await readCurrentVersion();
    const r = runGuard({
      GITHUB_HEAD_REF: `feature/v${v}`,
      GITHUB_REF_NAME: "feature/v9.99.99", // would otherwise fail
    });
    expect(r.status).toBe(0);
  });
});
