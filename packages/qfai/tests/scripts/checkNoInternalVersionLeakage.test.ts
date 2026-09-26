/**
 * Spawn-based tests for `scripts/check-no-internal-version-leakage.sh`
 * defense branches.
 *
 * The leakage guard's *positive* path (real distributed surfaces have
 * zero hits) is already covered by the integration smoke test
 * `tests/integration/distributedSurfaceLeakage.test.ts`. These tests
 * cover the *negative* defense branches that prevent the guard from
 * silently passing when its inputs are malformed:
 *
 *   - packlist fail-loud: when `npm pack --dry-run` cannot list the
 *     package, the guard must exit 1 (not silently pass via mapfile).
 *   - packlist scope: the surface is what npm packs, so the manifest, a
 *     file npm always adds, and whatever a glob in files[] expands to are
 *     all scanned.
 *   - not-yet-built WARN: a files[] entry with nothing on disk is named in
 *     a WARN, and the guard still exits 0 (lint-only CI passes
 *     legitimately have no `dist/`).
 *   - filename pass: `grep -rn` only ever matches line content, so a
 *     marker encoded in a path component used to ship green. The name
 *     scan must report it with its own message, and no path is exempt.
 *   - name pass scope: the name regexes run over paths relative to
 *     `$ROOT`, so an absolute `QFAI_LEAKAGE_SCAN_ROOT` whose own
 *     ancestors carry a version marker does not fail a clean surface.
 *
 * Tests stage a temp directory with a controllable `package.json` and
 * spawn the script with cwd=tempDir so the script's auto-ROOT detection
 * falls through to `ROOT="."`.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { removeTempTree } from "../helpers/tempTree.js";
import {
  STORY_ID_BOUNDARIES,
  STORY_ID_TRAILING_HYPHEN_BOUNDARIES,
  scanDistributedSurface,
} from "../helpers/distributedSurfaceScan.js";

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

function runGuard(cwd: string, env: NodeJS.ProcessEnv = {}): RunResult {
  const child = spawnSync("bash", [SCRIPT], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, ...env },
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
  it.each(STORY_ID_BOUNDARIES)(
    "accepts %s and rejects %s in packed content",
    async (sample, internal) => {
      const root = await newTempDir();
      await stageAssets(root, [["sample.md", `${sample}\n`]]);
      expect((await scanDistributedSurface(root)).hits).toEqual([]);
      expect(runGuard(root).status).toBe(0);
      await writeFile(path.join(root, "assets", "sample.md"), `${internal}\n`, "utf-8");
      expect((await scanDistributedSurface(root)).hits.map((hit) => hit.className)).toEqual([
        "internal story id",
      ]);
      const result = runGuard(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("sample.md");
    },
  );

  it.each(STORY_ID_TRAILING_HYPHEN_BOUNDARIES)(
    "accepts %s and rejects %s at a packed line end",
    async (sample, internal) => {
      const root = await newTempDir();
      await stageAssets(root, [["sample.md", sample]]);
      expect((await scanDistributedSurface(root)).hits).toEqual([]);
      expect(runGuard(root).status).toBe(0);
      await writeFile(path.join(root, "assets", "sample.md"), internal, "utf-8");
      expect((await scanDistributedSurface(root)).hits.map((hit) => hit.className)).toEqual([
        "internal story id",
      ]);
      const result = runGuard(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("sample.md");
    },
  );

  it("keeps old composite decisions and questions in their existing class", async () => {
    const root = await newTempDir();
    await stageAssets(root, [["sample.md", "DEC-0010-0001 OQ-0010-0001\n"]]);
    const result = runGuard(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DEC-0010-0001 OQ-0010-0001");
  });

  it("scans story IDs in packed file names", async () => {
    const root = await newTempDir();
    await stageAssets(root, [["BF-0010.md", "clean body\n"]]);
    const result = runGuard(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("FILE NAME");
    expect(result.stderr).toContain("BF-0010.md");
  });

  it("fails loudly when npm cannot list the package (exit 1)", async () => {
    // Regression: an earlier draft used `mapfile < <(node -e '...')`
    // which silently swallowed node failures, masking corrupt
    // package.json. The capture-then-mapfile pattern must surface it.
    const tmp = await newTempDir();
    await writeFile(path.join(tmp, "package.json"), "{ this is not valid json", "utf-8");
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/could not enumerate the files npm would pack/);
  });

  it("fails on a schemaVersion in the published manifest (exit 1)", async () => {
    // npm adds package.json to every package whatever files[] says, so the
    // manifest is shipped surface like any file the list names.
    const tmp = await newTempDir();
    await stageAssets(tmp, [["clean.md", "clean body\n"]]);
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: ["assets"], schemaVersion: 2 }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/schemaVersion field present in distributed surface .*package\.json/);
  });

  it("fails on a private version marker in the published manifest (exit 1)", async () => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [["clean.md", "clean body\n"]]);
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "fake",
        version: "0.0.0",
        description: "the v2.0 cut",
        files: ["assets"],
      }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in .*package\.json/);
    expect(r.stderr).toContain("v2.0");
  });

  it("passes the manifest's own version field (exit 0)", async () => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [["clean.md", "clean body\n"]]);
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "3.12.0", files: ["assets"] }),
      "utf-8",
    );
    const r = runGuard(tmp);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/OK: no internal spec ids/);
  });

  it("scans a file npm adds that files[] does not name (exit 1)", async () => {
    // npm always packs README; the include list below names only assets.
    const tmp = await newTempDir();
    await stageAssets(tmp, [["clean.md", "clean body\n"]]);
    await writeFile(path.join(tmp, "README.md"), "See DR-0007.\n", "utf-8");
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in .*README\.md/);
  });

  it("scans every file npm packs when package.json has no files[] field (exit 1)", async () => {
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0" }),
      "utf-8",
    );
    await writeFile(path.join(tmp, "notes.md"), "Carries CHG-003.\n", "utf-8");
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in .*notes\.md/);
  });

  it("scans what a glob in package.json#files packs (exit 1)", async () => {
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: ["assets/*.md"] }),
      "utf-8",
    );
    await mkdir(path.join(tmp, "assets"), { recursive: true });
    await writeFile(path.join(tmp, "assets", "notes.md"), "Carries CHG-003.\n", "utf-8");
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in .*assets/);
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

  it.each([
    ["CAP-0009", 0],
    ["CAP-0999", 1],
    ["CAP-1000", 1],
  ])("reads %s in shipped content as a capability ID only from CAP-0010 up", async (id, status) => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [["notes.md", `Implements ${id}.\n`]]);
    const r = runGuard(tmp);
    expect(r.status, r.stderr).toBe(status);
    if (status === 1) expect(r.stderr).toContain(id);
  });

  // No path is exempt from the name pass: a name shaped like the migration
  // memo `qfai init` no longer writes is a version marker like any other.
  it.each([
    "init/.qfai/assistant/process/migrations/v1.4.27-atdd-alignment.md",
    "init/.qfai/assistant/process/migrations/v2.0.0.md",
  ])("flags the version stamp in a migration-memo-shaped name %s (exit 1)", async (name) => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [[name, "clean body\n"]]);
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in a FILE NAME/);
    expect(r.stderr).toContain(path.posix.basename(name));
  });

  it("reports a version-marker name and a spec-id name from the same surface (exit 1)", async () => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [
      ["init/notes-v2.0-draft.md", "clean body\n"],
      ["init/spec-0042-recut.md", "clean body\n"],
    ]);
    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/notes-v2[.]0-draft[.]md/);
    expect(r.stderr).toMatch(/spec-0042-recut[.]md/);
  });

  it("ignores version markers in the scan root's own ancestors (exit 0)", async () => {
    // Regression: the name pass used to run over `find "$ROOT/$entry"`
    // output, so an absolute `QFAI_LEAKAGE_SCAN_ROOT` such as
    // `/tmp/qfai-v2.0/package` matched the version regex on every path
    // even when the distributed surface itself was clean. Only the
    // files[] entries are the distributed surface.
    const outer = await newTempDir();
    const root = path.join(outer, "qfai-v2.0", "package");
    await mkdir(root, { recursive: true });
    await stageAssets(root, [["init/clean.md", "clean body\n"]]);
    // bash treats `\` as an escape, so hand the script a POSIX-separated
    // absolute path on every platform.
    const r = runGuard(outer, { QFAI_LEAKAGE_SCAN_ROOT: root.split(path.sep).join("/") });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/OK: no internal spec ids/);
  });

  it("scans a files[] entry whose name starts with a hyphen (exit 1)", async () => {
    // `find -notes-v2.0` reads a leading hyphen as a predicate, not a start
    // point. With the error suppressed that looked exactly like an empty
    // tree: the guard skipped the surface, found no names, and exited 0 on a
    // directory whose own name carries the marker.
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: ["-notes-v2.0"] }),
      "utf-8",
    );
    await mkdir(path.join(tmp, "-notes-v2.0"), { recursive: true });
    await writeFile(path.join(tmp, "-notes-v2.0", "clean.md"), "clean body\n", "utf-8");

    const r = runGuard(tmp);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaked in a FILE NAME/);
    expect(r.stderr).toMatch(/notes-v2[.]0/);
  });

  it("enumerates a hyphen-named entry that is itself clean (exit 0)", async () => {
    // The anchoring must not turn every odd name into a failure: an entry
    // that starts with a hyphen and carries no marker still passes.
    const tmp = await newTempDir();
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fake", version: "0.0.0", files: ["-assets"] }),
      "utf-8",
    );
    await mkdir(path.join(tmp, "-assets"), { recursive: true });
    await writeFile(path.join(tmp, "-assets", "clean.md"), "clean body\n", "utf-8");

    const r = runGuard(tmp);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/OK: no internal spec ids/);
  });

  it("warns and passes when every files[] entry is absent on disk (exit 0)", async () => {
    // Lint-only CI passes legitimately have no `dist/` yet. The guard
    // should emit a WARN naming what was not scanned and exit 0 — without
    // pretending the scan was complete. The manifest is still scanned.
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
    expect(r.stderr).toMatch(/not on disk yet .*: dist missing-asset-dir/);
  });
});

/**
 * Put an `npm` on PATH that answers `pack` with `report`, so each shape npm
 * has printed is read without that npm being installed.
 */
async function fakeNpmPrinting(report: unknown): Promise<NodeJS.ProcessEnv> {
  const bin = await newTempDir();
  const reportFile = path.join(bin, "pack-report.json");
  await writeFile(reportFile, JSON.stringify(report), "utf-8");
  await writeFile(path.join(bin, "npm"), `#!/usr/bin/env bash\ncat '${reportFile}'\n`, {
    encoding: "utf-8",
    mode: 0o755,
  });
  return { PATH: `${bin}${path.delimiter}${process.env.PATH ?? ""}` };
}

/** One pack whose only file is `assets/notes.md`, as npm reports it. */
const NOTES_PACK = {
  id: "fake@0.0.0",
  name: "fake",
  version: "0.0.0",
  files: [{ path: "assets/notes.md", size: 17, mode: 420 }],
};

describe("check-no-internal-version-leakage.sh reads every shape npm pack --json prints", () => {
  // npm 12 prints an object keyed by package name where npm 11 printed an
  // array. The publish job pins a newer npm than the CI runners carry, so a
  // guard that read only the array passed CI and failed at release.
  it.each([
    ["an array of packs (npm 11 and earlier)", [NOTES_PACK]],
    ["an object keyed by package name (npm 12 and later)", { fake: NOTES_PACK }],
  ])("scans what %s lists (exit 1)", async (_shape, report) => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [["notes.md", "Carries CHG-003.\n"]]);
    const r = runGuard(tmp, await fakeNpmPrinting(report));
    expect(r.status, r.stderr).toBe(1);
    expect(r.stderr).toMatch(/leaked in .*assets/);
  });

  it("refuses an object naming two packs rather than choosing one (exit 1)", async () => {
    const tmp = await newTempDir();
    await stageAssets(tmp, [["notes.md", "clean body\n"]]);
    const report = { fake: NOTES_PACK, other: { ...NOTES_PACK, name: "other" } };
    const r = runGuard(tmp, await fakeNpmPrinting(report));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/could not enumerate the files npm would pack/);
  });
});
