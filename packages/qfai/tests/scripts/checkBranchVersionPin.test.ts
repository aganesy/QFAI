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

  it("passes for release/vX.Y.Z naming style (leading v required)", async () => {
    const v = await readCurrentVersion();
    const r = runGuard({ GITHUB_REF_NAME: `release/v${v}` });
    expect(r.status).toBe(0);
  });

  it("skips when SemVer-shaped digits lack the required leading 'v' (e.g. dependency upgrade branch)", () => {
    // After PR #206 review (#1, #28): the regex requires a leading `v`
    // with word boundary so dependency-version-shaped branches such as
    // `feature/upgrade-eslint-9.10.0` are NOT mis-pinned to 9.10.0.
    const r = runGuard({ GITHUB_REF_NAME: "feature/upgrade-eslint-9.10.0" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no SemVer pin/);
  });

  it("skips for postgres-style versioned branch without leading v", () => {
    const r = runGuard({ GITHUB_REF_NAME: "feature/upgrade-postgres-15.4.0" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no SemVer pin/);
  });

  it("skips for log4j-style suffix without leading v", () => {
    const r = runGuard({ GITHUB_REF_NAME: "fix/log4j-2.17.1" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no SemVer pin/);
  });

  it("ignores PR-context refs like 206/merge that contain digits but no v-prefixed SemVer", () => {
    // pull_request_target sets GITHUB_REF_NAME to `<pr-number>/merge`.
    // We want HEAD_REF (the PR source branch) to win, but if HEAD_REF is
    // empty for any reason we should NOT mis-pin on `206/merge`.
    const r = runGuard({ GITHUB_REF_NAME: "206/merge" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no SemVer pin/);
  });

  it("emits a GitHub Actions warning when VERSION_PIN_SKIP=1 is used", () => {
    const r = runGuard({
      GITHUB_REF_NAME: "feature/v9.99.99",
      VERSION_PIN_SKIP: "1",
    });
    expect(r.status).toBe(0);
    // GitHub Actions surfaces `::warning::` lines in the run summary so
    // reviewers cannot miss a skip.
    expect(r.stdout).toMatch(/::warning title=VERSION_PIN_SKIP=1::/);
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

  // PR #206 review LtQx: explicit coverage of the canonical pre-release /
  // build-metadata rejection added to the script. Without these tests a
  // future regression that loosens the regex (e.g. dropping the `-rc` /
  // `+build` discriminator) could ship green.

  it.each([
    ["release/v1.9.0-rc.1", "rc"],
    ["release/v1.0.0-alpha", "alpha"],
    ["release/v2.3.4-beta.2", "beta"],
    ["release/v1.0.0-pre", "pre"],
    ["release/v1.0.0-next.10", "next"],
  ])("rejects pre-release SemVer branch '%s' (%s)", (branch) => {
    const r = runGuard({ GITHUB_REF_NAME: branch });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/pre-release \/ build/);
    expect(r.stderr).toMatch(/VERSION_PIN_SKIP=1/);
  });

  it("rejects build-metadata SemVer branch", () => {
    const r = runGuard({ GITHUB_REF_NAME: "release/v1.9.0+build.5" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/pre-release \/ build/);
  });

  it("does NOT reject slug-style suffix (feature/vX.Y.Z-bugfix-x)", async () => {
    const v = await readCurrentVersion();
    const r = runGuard({ GITHUB_REF_NAME: `feature/v${v}-bugfix-x` });
    // Slug suffix is allowed by the master rule's recommended naming
    // convention `<type>/v<X.Y.Z>[-<slug>]` (.agents/rules/version-discipline.md).
    expect(r.status).toBe(0);
  });

  it("VERSION_PIN_SKIP=1 still honoured for legitimate pre-release branches", () => {
    const r = runGuard({
      GITHUB_REF_NAME: "release/v1.9.0-rc.1",
      VERSION_PIN_SKIP: "1",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/skipping/);
    expect(r.stdout).toMatch(/::warning title=VERSION_PIN_SKIP=1::/);
  });
});
