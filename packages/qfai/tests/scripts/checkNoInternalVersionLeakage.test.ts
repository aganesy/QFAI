/**
 * Spawn-based tests for `scripts/check-no-internal-version-leakage.sh`
 * defense branches added in PR #206.
 *
 * The leakage guard's *positive* path (real distributed surfaces have
 * zero hits) is already covered by the integration smoke test
 * `tests/integration/distributedSurfaceLeakage.test.ts`. These tests
 * cover the *negative* defense branches that prevent the guard from
 * silently passing when its inputs are malformed:
 *
 *   - node failure fail-loud (L57-L68): package.json parse failure or
 *     files[] missing must exit 1 (not silently pass via mapfile).
 *   - glob entry rejection (L79-L85): `dist/**` style globs in
 *     package.json#files must be refused so the guard does not
 *     silently miss leakage in unexpanded globs.
 *   - empty SCAN_PATHS WARN (L97-L102): if every files[] entry is
 *     missing on disk, the guard emits a WARN but exits 0 (lint-only
 *     CI passes legitimately have no `dist/`).
 *
 * Tests stage a temp directory with a controllable `package.json` and
 * spawn the script with cwd=tempDir so the script's auto-ROOT detection
 * falls through to `ROOT="."`.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { removeTempTree } from "../helpers/tempTree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(PKG_ROOT, "scripts/check-no-internal-version-leakage.sh");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-leakage-script-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await removeTempTree(dir);
  }
});

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(cwd: string): RunResult {
  const child = spawnSync("bash", [SCRIPT], {
    cwd,
    encoding: "utf-8",
  });
  return {
    status: child.status,
    stdout: child.stdout ?? "",
    stderr: child.stderr ?? "",
  };
}

describe("check-no-internal-version-leakage.sh defense branches", () => {
  it("fails loudly when package.json is unparseable (node exit -> exit 1)", async () => {
    // Regression: an earlier draft used `mapfile < <(node -e '...')`
    // which silently swallowed node failures, masking corrupt
    // package.json. The capture-then-mapfile pattern must surface it.
    const tmp = await newTempDir();
    await writeFile(path.join(tmp, "package.json"), "{ this is not valid json", "utf-8");
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/could not enumerate package\.json#files/);
  });

  it("fails loudly when package.json is missing files[] field (exit 1)", async () => {
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0" }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/missing files\[\] field|could not enumerate/);
  });

  it("fails loudly when package.json#files is not an array (exit 1)", async () => {
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: "dist" }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/missing files\[\] field|could not enumerate/);
  });

  it("rejects glob '**' patterns in package.json#files (exit 1)", async () => {
    // Globs like `dist/**` would be treated as literal paths and silently
    // skipped by the on-disk existence check, leaking unscanned content.
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: ["dist/**"] }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/glob pattern 'dist\/\*\*'/);
    expect(r.stderr).toMatch(/literal file\/directory paths only/);
  });

  it("rejects glob '*' patterns in package.json#files (exit 1)", async () => {
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: ["assets/*.md"] }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/glob pattern 'assets\/\*\.md'/);
  });

  it("rejects glob '?' patterns in package.json#files (exit 1)", async () => {
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: ["asset?/file.md"] }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/glob pattern 'asset\?\/file\.md'/);
  });

  it("warns and passes when every files[] entry is absent on disk (exit 0)", async () => {
    // Lint-only CI passes legitimately have no `dist/` yet. The guard
    // should emit a WARN naming what was skipped and exit 0 — without
    // pretending the scan was complete.
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "fake",
        version: "0.0.0",
        files: ["dist", "missing-asset-dir"],
      }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/no distributed surfaces found|nothing scanned/);
  });
});
