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
 *   - filename pass: `grep -rn` only ever matches line content, so a
 *     marker encoded in a path component used to ship green. The name
 *     scan must report it with its own message, while honouring the
 *     documented `assistant/process/migrations/` version exemption.
 *
 * Tests stage a temp directory with a controllable `package.json` and
 * spawn the script with cwd=tempDir so the script's auto-ROOT detection
 * falls through to `ROOT="."`.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

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
    if (dir) await rm(dir, { recursive: true, force: true });
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

/**
 * Stage a `package.json` whose only distributed surface is `assets/`,
 * plus the given `assets/`-relative files. Bodies are kept free of
 * forbidden tokens so any hit can only come from the name pass.
 */
async function stageAssets(root: string, files: ReadonlyArray<[string, string]>): Promise<void> {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "fake", version: "0.0.0", files: ["assets"] }),
    "utf-8",
  );
  for (const [relative, body] of files) {
    const target = path.join(root, "assets", relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, "utf-8");
  }
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

  it("flags an internal version marker carried by a file NAME (exit 1)", async () => {
    // Regression: the guard scanned file *contents* only, so a shipped
    // asset whose marker lived in its name passed green.
    const tmp = await newTempDir();
    await stageAssets(tmp, [["notes-v2.0-draft.md", "clean body\n"]]);
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in a FILE NAME/);
    expect(r.stderr).toMatch(/notes-v2[.]0-draft[.]md/);
  });

  it("flags an internal spec id carried by a file NAME (exit 1)", async () => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [["spec-0042-notes.md", "clean body\n"]]);
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in a FILE NAME/);
    expect(r.stderr).toMatch(/spec-0042-notes[.]md/);
  });

  it("flags an internal trace id carried by a DIRECTORY name (exit 1)", async () => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [["DR-0007/notes.md", "clean body\n"]]);
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in a FILE NAME/);
    expect(r.stderr).toMatch(/DR-0007/);
  });

  it("exempts version-stamped migration memo names from the name pass (exit 0)", async () => {
    // `assistant/process/migrations/<version>-*.md` names are stamped on
    // purpose — see the exemption block in the guard.
    const tmp = await newTempDir();
    await stageAssets(tmp, [
      ["init/.qfai/assistant/process/migrations/v1.4.27-atdd-alignment.md", "clean body\n"],
    ]);
    const r = runGuard(tmp);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/OK: no internal spec ids/);
  });

  it("keeps a spec id inside a migration memo name a failure (exit 1)", async () => {
    // The exemption is scoped to the version class only.
    const tmp = await newTempDir();
    await stageAssets(tmp, [
      ["init/.qfai/assistant/process/migrations/spec-0042-recut.md", "clean body\n"],
    ]);
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in a FILE NAME/);
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
