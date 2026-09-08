/**
 * Spawn-based tests for `scripts/check-mdschema.mjs`.
 *
 * The driver's contract:
 *   - every in-scope document conforms          -> exit 0
 *   - any document violates its schema          -> exit 1, naming the document type
 *   - `--scope files` checks only what is named
 *   - `--scope all` checks everything the manifest matches
 *   - a degraded git base FAILS OPEN to `all` rather than checking nothing
 *   - `paths.specsDir` is read from the tree's own `qfai.config.yaml`
 *   - unknown flag / bad scope / missing root    -> exit 2
 *
 * Each case builds its own tree under `--root`, so the assertions are about the
 * driver rather than about whichever documents this repository happens to hold.
 * The SCHEMAS are deliberately not relocatable: `--root` moves the documents,
 * never the contract they are checked against.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// The IMPLEMENTATION, not the repository-root delegator: the delegator exits
// the process on load, so it exports nothing at all — importing it would end the
// test run during collection. The spawn cases below still address the delegator,
// because that is the path `pnpm lint:mdschema` and CI invoke.
// @ts-expect-error -- a plain .mjs guard with no type declarations
import { findMdschemaCommand, patternToRegExp } from "../../assets/scripts/check-mdschema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-mdschema.mjs");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runDriver(args: string[]): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    timeout: 120_000,
  });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-lane-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

/** A `01_Spec.md` that satisfies the shipped spec-overview schema. */
const CONFORMING_SPEC = [
  "# 01 Spec",
  "",
  "## Consumer View",
  "",
  "- Primary SSOT for execution: this file",
  "",
  "## Scope",
  "",
  "- In: the thing",
  "- Out: the other thing",
  "",
  "## Applicable NFR",
  "",
  "- NFR: none inherited",
  "",
  "## Applicable Policy",
  "",
  "- Policy: none inherited",
  "",
  "## Evidence Summary",
  "",
  "- Evidence: none yet",
  "",
  "## Relevant Requirements",
  "",
  "- REQ: none yet",
  "",
  "## Entry points",
  "",
  "- US range in this spec: none yet",
  "",
].join("\n");

/** The same document with `## Scope` removed. */
const NON_CONFORMING_SPEC = CONFORMING_SPEC.replace(
  "## Scope\n\n- In: the thing\n- Out: the other thing\n\n",
  "",
);

async function writeSpec(root: string, pack: string, body: string): Promise<string> {
  const dir = path.join(root, ".qfai", "specs", pack);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_Spec.md"), body, "utf-8");
  return `.qfai/specs/${pack}/01_Spec.md`;
}

describe("check-mdschema driver", () => {
  it("exits 0 and counts the files when every document conforms", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", CONFORMING_SPEC);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 file(s) conform");
  });

  it("exits 1 and names the document type when a document violates its schema", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", NON_CONFORMING_SPEC);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    // The manifest entry id, so a reader knows which contract was broken
    // without matching the violation text against 22 schemas by eye.
    expect(result.stderr).toContain("spec-overview");
    expect(result.stderr).toContain("Scope");
  });

  it("reports a per-document-type summary when asked", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", CONFORMING_SPEC);

    const result = runDriver(["--root", root, "--scope", "all", "--summary"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PASS");
    expect(result.stdout).toContain("spec-overview");
  });

  it("checks only the named documents under --scope files", async () => {
    const root = await newTempDir();
    const good = await writeSpec(root, "spec-0001", CONFORMING_SPEC);
    await writeSpec(root, "spec-0002", NON_CONFORMING_SPEC);

    const result = runDriver(["--root", root, "--scope", "files", good]);

    // The broken pack exists and is deliberately out of scope: a `files` run
    // that widened to the tree would make the flag meaningless.
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 file(s) conform");
  });

  it("fails open to the whole tree when the git base is unreachable", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", NON_CONFORMING_SPEC);

    // A temp directory is not a git repository, so the diff is degraded. The
    // lane must widen rather than silently check nothing and report green —
    // that would claim a result it never established.
    const result = runDriver(["--root", root, "--base", "no/such/ref"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec-overview");
  });

  it("reads paths.specsDir from the tree's own qfai.config.yaml", async () => {
    const root = await newTempDir();
    const dir = path.join(root, "docs", "specs", "spec-0001");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "01_Spec.md"), NON_CONFORMING_SPEC, "utf-8");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: docs/specs\n  outDir: .qfai/report\n",
      "utf-8",
    );

    const result = runDriver(["--root", root, "--scope", "all"]);

    // Found at the relocated path: an adopter who moved their specs is covered
    // without editing the manifest.
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec-overview");
  });

  it("exits 0 when the tree has no documents the manifest matches", async () => {
    const root = await newTempDir();

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("0 file(s) conform");
  });

  it("exits 2 on an unknown flag", () => {
    const result = runDriver(["--no-such-flag"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown flag");
  });

  it("exits 2 on an unrecognised scope", async () => {
    const root = await newTempDir();

    const result = runDriver(["--root", root, "--scope", "everything"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("changed|all|files");
  });

  it("exits 2 when --root is not a directory", () => {
    const result = runDriver(["--root", path.join(os.tmpdir(), "qfai-absent-root")]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("not a directory");
  });

  it("exits 2 when --scope files is given no path", async () => {
    const root = await newTempDir();

    const result = runDriver(["--root", root, "--scope", "files"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("at least one path");
  });
});

describe("check-mdschema pattern compilation", () => {
  it("matches a single segment with one star", () => {
    const re = patternToRegExp(".qfai/specs/spec-*/01_Spec.md");

    expect(re.test(".qfai/specs/spec-0001/01_Spec.md")).toBe(true);
    expect(re.test(".qfai/specs/spec-0001/02_User-stories.md")).toBe(false);
  });

  it("does not let one star cross a path separator", () => {
    // The ordinary glob distinction, and the reason a pattern rooted at the
    // specs directory cannot reach into a nested tree by accident.
    const re = patternToRegExp(".qfai/specs/spec-*/01_Spec.md");

    expect(re.test(".qfai/specs/spec-0001/nested/01_Spec.md")).toBe(false);
  });

  it("crosses separators with two stars", () => {
    const re = patternToRegExp(".qfai/**/01_Spec.md");

    expect(re.test(".qfai/specs/spec-0001/01_Spec.md")).toBe(true);
  });

  it("makes `**/` zero or more whole directories, not a bare wildcard", () => {
    // The separator is part of what repeats. Dropping it let the wildcard end
    // mid-segment, so `**/01_Spec.md` matched `x01_Spec.md` — a file the
    // pattern does not name.
    const re = patternToRegExp(".qfai/**/01_Spec.md");

    expect(re.test(".qfai/01_Spec.md")).toBe(true);
    expect(re.test(".qfai/specs/spec-0001/01_Spec.md")).toBe(true);
    expect(re.test(".qfai/x01_Spec.md")).toBe(false);
    expect(re.test(".qfai/specs/x01_Spec.md")).toBe(false);
  });

  it("anchors both ends", () => {
    const re = patternToRegExp(".qfai/specs/spec-*/01_Spec.md");

    expect(re.test("vendor/.qfai/specs/spec-0001/01_Spec.md")).toBe(false);
    expect(re.test(".qfai/specs/spec-0001/01_Spec.md.bak")).toBe(false);
  });

  it("escapes regex metacharacters in the literal parts", () => {
    // `.` is a literal dot in a glob; left unescaped it would match any
    // character and `Xqfai/...` would pass.
    const re = patternToRegExp(".qfai/specs/spec-*/01_Spec.md");

    expect(re.test("Xqfai/specs/spec-0001/01_Spec.md")).toBe(false);
  });
});

/**
 * Finding the mdschema command line.
 *
 * The lane runs the package's own JS entry point with the Node that is already
 * running, and never the `node_modules/.bin` shim. The shim is a different file
 * per platform, and on Windows the runnable one is `mdschema.cmd`: Node refuses
 * to spawn a `.cmd` without a shell and returns `EINVAL`, so a resolver that
 * picked a shim failed there every time. The entry point is one file on every
 * platform, so these cases hold on all of them.
 */
describe("check-mdschema command resolution", () => {
  const seedPackage = async (root: string, bin: unknown, entry = "bin/cli.js"): Promise<string> => {
    const packageDir = path.join(root, "node_modules", "@jackchuka", "mdschema");
    await mkdir(path.join(packageDir, path.dirname(entry)), { recursive: true });
    await writeFile(path.join(packageDir, entry), "", "utf-8");
    await writeFile(
      path.join(packageDir, "package.json"),
      JSON.stringify({ name: "@jackchuka/mdschema", bin }),
      "utf-8",
    );
    return path.join(packageDir, entry);
  };

  it("runs the declared entry point with the running Node", async () => {
    const root = await newTempDir();
    const entry = await seedPackage(root, { mdschema: "bin/cli.js" });

    expect(findMdschemaCommand(root)).toEqual({ command: process.execPath, args: [entry] });
  });

  it("walks up from the given directory to the nearest installation", async () => {
    const root = await newTempDir();
    const entry = await seedPackage(root, { mdschema: "bin/cli.js" });
    await mkdir(path.join(root, "nested", "deeper"), { recursive: true });

    expect(findMdschemaCommand(path.join(root, "nested", "deeper"))?.args).toEqual([entry]);
  });

  it("reads a bin field written as a bare string", async () => {
    // The spelling a package with one command may use.
    const root = await newTempDir();
    const entry = await seedPackage(root, "bin/cli.js");

    expect(findMdschemaCommand(root)?.args).toEqual([entry]);
  });

  it("never names a .bin shim", async () => {
    // The shim is what fails on Windows, and it sits beside a real installation
    // in every tree — so finding one is not a reason to run it.
    const root = await newTempDir();
    const shims = path.join(root, "node_modules", ".bin");
    await mkdir(shims, { recursive: true });
    for (const name of ["mdschema", "mdschema.cmd", "mdschema.ps1"]) {
      await writeFile(path.join(shims, name), "", "utf-8");
    }
    const entry = await seedPackage(root, { mdschema: "bin/cli.js" });

    const resolved = findMdschemaCommand(root);

    expect(resolved).toEqual({ command: process.execPath, args: [entry] });
    expect(resolved?.args?.[0]).not.toContain(`${path.sep}.bin${path.sep}`);
  });

  it("keeps walking past an installation whose declared file is not there", async () => {
    // A partial or interrupted install. Stopping here would report the command
    // as found and then fail to run it, which is the failure this resolution
    // exists to remove.
    const root = await newTempDir();
    const outer = path.join(root, "outer");
    const inner = path.join(outer, "inner");
    await mkdir(inner, { recursive: true });
    const entry = await seedPackage(root, { mdschema: "bin/cli.js" });
    const brokenDir = path.join(inner, "node_modules", "@jackchuka", "mdschema");
    await mkdir(brokenDir, { recursive: true });
    await writeFile(
      path.join(brokenDir, "package.json"),
      JSON.stringify({ name: "@jackchuka/mdschema", bin: { mdschema: "bin/cli.js" } }),
      "utf-8",
    );

    expect(findMdschemaCommand(inner)?.args).toEqual([entry]);
  });

  it.each([
    ["a manifest that is not JSON", "{"],
    ["a manifest declaring no bin", JSON.stringify({ name: "@jackchuka/mdschema" })],
    [
      "a bin naming another command only",
      JSON.stringify({ name: "@jackchuka/mdschema", bin: { other: "bin/cli.js" } }),
    ],
  ])("reports nothing found for %s", async (_name, manifest) => {
    const root = await newTempDir();
    const packageDir = path.join(root, "node_modules", "@jackchuka", "mdschema");
    await mkdir(path.join(packageDir, "bin"), { recursive: true });
    await writeFile(path.join(packageDir, "bin", "cli.js"), "", "utf-8");
    await writeFile(path.join(packageDir, "package.json"), manifest, "utf-8");

    // What the seeded installation declares is unreadable, so it is not an
    // answer. Whether the walk then finds another one further up is not this
    // case's subject: either way, this directory must not be what answered.
    expect(findMdschemaCommand(root)?.args?.[0]).not.toBe(path.join(packageDir, "bin", "cli.js"));
  });
});
