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
import {
  IGNORE_MARKER,
  findMdschemaCommand,
  firstHeading,
  optsOutOfSchema,
  patternToRegExp,
  rootHeadingPattern,
} from "../../assets/scripts/check-mdschema.mjs";

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

/** The same document with only its root heading replaced, sections intact. */
const WRONG_ROOT = CONFORMING_SPEC.replace("# 01 Spec", "# Something Else Entirely");

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

describe("a document that opts out of its schema", () => {
  it("is left unchecked, and the run says how many were", async () => {
    // A pack outlives what it specifies. A deleted spec is kept as the record
    // of why it went away, and that record cannot carry a consumer view for
    // something that no longer exists — so the choice is between writing
    // fiction and weakening the schema for every live pack.
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", `${IGNORE_MARKER}\n\n${NON_CONFORMING_SPEC}`);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 ignored");
  });

  it("is counted rather than made invisible", async () => {
    // An exclusion nobody can see is one nobody reviews. The per-type summary
    // names it too, so a whole document type opting out cannot read as a type
    // with no documents.
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", `${IGNORE_MARKER}\n\n${CONFORMING_SPEC}`);

    const result = runDriver(["--root", root, "--scope", "all", "--summary"]);

    expect(result.stdout).toContain("1 ignored");
    expect(result.stdout).toMatch(/spec-overview \(0 file\(s\), 1 ignored\)/);
  });

  it("leaves the documents beside it checked", async () => {
    // The marker is per document. One pack opting out must not excuse the
    // next, which is the whole difference from turning the lane off.
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", `${IGNORE_MARKER}\n\n${NON_CONFORMING_SPEC}`);
    await writeSpec(root, "spec-0002", NON_CONFORMING_SPEC);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec-overview");
  });

  it("does not read a marker written below the content", async () => {
    // A marker further down would cover a document that reads as checked to
    // anyone who does not scroll.
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", `${NON_CONFORMING_SPEC}\n${IGNORE_MARKER}\n`);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
  });
});

describe("reading the opt-out marker", () => {
  it.each([
    ["the first line", `${IGNORE_MARKER}\n# Title\n`, true],
    ["after a blank line", `\n${IGNORE_MARKER}\n# Title\n`, true],
    ["after another comment", `<!-- a note -->\n${IGNORE_MARKER}\n# Title\n`, true],
    [
      "after a comment spanning lines",
      `<!-- a note\n  over two lines -->\n${IGNORE_MARKER}\n`,
      true,
    ],
    ["indented up to three spaces", `   ${IGNORE_MARKER}\n# Title\n`, true],
    ["below a heading", `# Title\n${IGNORE_MARKER}\n`, false],
    ["absent", "# Title\n", false],
    ["in an empty document", "", false],
    // Four spaces or a tab opens an indented code block, so the line renders
    // as text rather than as a comment. A marker written there exempts
    // nothing, which is what keeps the "put it in the leading comment block"
    // rule from having a way around it.
    ["indented four spaces", `    ${IGNORE_MARKER}\n# Title\n`, false],
    ["indented with a tab", `\t${IGNORE_MARKER}\n# Title\n`, false],
    // The comment ends mid-line, so what follows is content and the block is
    // over before the marker is reached.
    [
      "after content on a comment's closing line",
      `<!-- a note --> and text\n${IGNORE_MARKER}\n`,
      false,
    ],
    // A marker inside a comment is comment text, not a marker.
    ["inside a comment", `<!-- a note\n${IGNORE_MARKER}\n# Title\n`, false],
  ])("reads a marker %s as %s", (_where, text, expected) => {
    expect(optsOutOfSchema(text)).toBe(expected);
  });

  it("reads only the marker itself, not a line that carries it", () => {
    // A line mentioning the marker — a document explaining the convention — is
    // not a document using it.
    expect(optsOutOfSchema(`${IGNORE_MARKER} for a deleted pack\n`)).toBe(false);
    expect(optsOutOfSchema(`Write ${IGNORE_MARKER} at the top.\n`)).toBe(false);
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

/**
 * `--scope changed` judges each touched document against its own state at the
 * merge base.
 *
 * Without that, a document predating the schema fails whole, so editing one
 * line of it reports every violation it already had as this branch's — and the
 * migration the flag exists to allow can never land incrementally, because the
 * first edit to a legacy document has to carry all of it.
 *
 * These cases need a real repository with two commits, which the tree builders
 * above do not make: outside a repository the scope degrades and fails open to
 * `all`, where no ratchet applies.
 */
describe("the ratchet in --scope changed", () => {
  function git(root: string, ...args: string[]): void {
    const done = spawnSync("git", args, { cwd: root, encoding: "utf-8" });
    if (done.status !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${done.stderr ?? ""}`);
    }
  }

  /**
   * A repository holding `base` on `main`, with `head` committed on a branch.
   *
   * Every document is written at both revisions, so a case says what changed by
   * giving the two states rather than by mutating a tree between commands.
   */
  async function twoCommits(
    base: Record<string, string>,
    head: Record<string, string>,
  ): Promise<string> {
    const root = await newTempDir();
    git(root, "init", "-q", "-b", "main", ".");
    git(root, "config", "user.email", "lane@example.com");
    git(root, "config", "user.name", "lane");
    for (const [pack, body] of Object.entries(base)) {
      await writeSpec(root, pack, body);
    }
    git(root, "add", "-A");
    git(root, "commit", "-qm", "base");
    git(root, "checkout", "-q", "-b", "work");
    for (const [pack, body] of Object.entries(head)) {
      await writeSpec(root, pack, body);
    }
    git(root, "add", "-A");
    git(root, "commit", "-qm", "head");
    return root;
  }

  /** The same legacy document at both revisions, one line longer at the head. */
  const LEGACY = "# spec: a heading the schema does not accept\n\n## Metadata\n\n- something\n";
  const LEGACY_EDITED = `${LEGACY}- one more line\n`;

  it("leaves a pre-existing failure to its own change when a branch edits the document", async () => {
    const root = await twoCommits({ "spec-0002": LEGACY }, { "spec-0002": LEGACY_EDITED });

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no new violations");
    expect(result.stdout).toContain("already failing at the merge base");
  });

  it("reports the inherited failure rather than dropping it", async () => {
    // Held back is not the same as hidden. A document nobody is told about is
    // one nobody migrates, which is the backlog this flag exists to let shrink.
    const root = await twoCommits({ "spec-0002": LEGACY }, { "spec-0002": LEGACY_EDITED });

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main", "--summary"]);

    expect(result.stdout).toContain("pre-existing, not this branch's");
    expect(result.stdout).toContain("01_Spec.md");
    expect(result.stdout).toContain("PASS  spec-overview (1 file(s), 1 pre-existing)");
  });

  it("fails when a branch breaks a document that conformed at the merge base", async () => {
    const root = await twoCommits(
      { "spec-0001": CONFORMING_SPEC },
      { "spec-0001": NON_CONFORMING_SPEC },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec-overview");
  });

  it("fails when a branch adds a document that does not conform", async () => {
    // Absent at the base is not "was already failing". This is the first run
    // that could have reported it.
    const root = await twoCommits({ "spec-0001": CONFORMING_SPEC }, { "spec-0003": LEGACY });

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
  });

  it("still fails for what the branch owes when it also edits a legacy document", async () => {
    const root = await twoCommits(
      { "spec-0001": CONFORMING_SPEC, "spec-0002": LEGACY },
      { "spec-0001": NON_CONFORMING_SPEC, "spec-0002": LEGACY_EDITED },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
    // The two are separated by where they are printed: what this branch owes
    // goes to stderr with the failure, the inherited one to stdout without it.
    expect(result.stderr).toContain("spec-0001");
    expect(result.stderr).not.toContain("spec-0002");
    expect(result.stdout).toContain("spec-0002");
  });

  it("does not excuse a document the merge base checked against another contract", async () => {
    // Live at the base and retired at the head is two document shapes at one
    // path. Running the base text against the head's contract would fail it for
    // lacking a section only the retired shape owes, and the real omission
    // would read as pre-existing.
    const retiredWithoutItsRecord = CONFORMING_SPEC.replace(
      "# 01 Spec\n",
      "# 01 Spec\n\n- Status: superseded\n",
    );
    const root = await twoCommits(
      { "spec-0001": CONFORMING_SPEC },
      { "spec-0001": retiredWithoutItsRecord },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec-overview-retired");
  });

  it("holds every violation against --scope all, which is the migration view", async () => {
    const root = await twoCommits({ "spec-0002": LEGACY }, { "spec-0002": LEGACY_EDITED });

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain("pre-existing");
  });

  it("leaves a root heading already wrong at the merge base to its own change", async () => {
    // The root-heading verdict is taken without `mdschema`, so it needs its own
    // answer to the ownership question the ratchet asks of everything else.
    const root = await twoCommits(
      { "spec-0002": WRONG_ROOT },
      { "spec-0002": `${WRONG_ROOT}- one more line\n` },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("pre-existing");
    expect(result.stdout).toContain("Root heading is");
  });

  it("fails when a branch breaks a root heading that matched at the merge base", async () => {
    const root = await twoCommits({ "spec-0001": CONFORMING_SPEC }, { "spec-0001": WRONG_ROOT });

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Root heading is");
  });

  it("leaves a document out of scope when only its line endings changed", async () => {
    // Re-normalising a tree to LF rewrites every file. Judging scope by which
    // blobs moved puts documents nobody edited into the gate, and every
    // violation they already carried reports at once — which is what makes
    // "normalise the line endings" and "keep the docs lane green" read as
    // alternatives.
    const root = await twoCommits(
      { "spec-0002": LEGACY },
      { "spec-0002": LEGACY.replace(/\n/g, "\r\n") },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main", "--summary"]);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("pre-existing, not this branch's");
  });

  it("keeps a document in scope when only its indentation changed", async () => {
    // The narrower flag is the point. Indentation carries meaning here: moving
    // a list item two spaces right nests it under its predecessor, which is a
    // shape change this gate grades. Ignoring all whitespace to reach the line
    // endings would take this edit with it.
    const root = await twoCommits(
      { "spec-0002": LEGACY },
      { "spec-0002": LEGACY.replace("- something", "  - something") },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main", "--summary"]);

    expect(result.stdout).toContain("pre-existing, not this branch's");
  });
});

/**
 * A document's sections are graded against the heading above them, so a root
 * heading the schema does not accept makes every section below it report as
 * unexpected. One wrong line becomes one violation per heading in the outline,
 * and none of those lines is true: the sections are where they belong.
 *
 * The verdict is taken from the schema's own declaration rather than from what
 * `mdschema` printed. Its message text is not a contract — the same prose comes
 * back for every `--format` — so a parser for it would tie this repository to
 * one release's rendering.
 */
describe("a root heading the schema does not accept", () => {
  it("reports one violation rather than one per section", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", WRONG_ROOT);

    const result = runDriver(["--root", root, "--scope", "all"]);
    const marks = (result.stderr.match(/✗/g) ?? []).length;

    // The document carries seven sections under its root.
    expect(result.status).toBe(1);
    expect(marks).toBe(1);
  });

  it("names what is there and what the schema requires", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", WRONG_ROOT);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.stderr).toContain('"# Something Else Entirely"');
    expect(result.stderr).toContain("^# 01 Spec");
  });

  it("says the document is not checked further", async () => {
    // Without that line a reader takes the absence of other violations for the
    // rest of the document being sound.
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", WRONG_ROOT);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.stderr).toContain("not checked further");
  });

  it("says so for a document with no heading at all", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", "Just a paragraph, no heading.\n");

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("no heading");
  });

  it("still grades a document whose root heading matches", async () => {
    // The short-circuit is scoped to the one condition that makes grading
    // meaningless. Everything else is still `mdschema`'s to answer.
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", NON_CONFORMING_SPEC);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("Root heading is");
    expect(result.stderr).toContain("Scope");
  });

  it("reports both kinds in one run, each from its own source", async () => {
    const root = await newTempDir();
    await writeSpec(root, "spec-0001", WRONG_ROOT);
    await writeSpec(root, "spec-0002", NON_CONFORMING_SPEC);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Root heading is");
    expect(result.stderr).toContain("Scope");
  });
});

describe("reading the root heading", () => {
  it("takes the pattern the schema declares at its root", () => {
    const schema = [
      "structure:",
      "  - heading:",
      '      pattern: "^# 01 Spec.*"',
      "      regex: true",
    ].join("\n");

    expect(rootHeadingPattern(schema)).toEqual({ pattern: "^# 01 Spec.*", regex: true });
  });

  it("answers null for a schema that declares no root heading", () => {
    // The caller then has no root to check against and leaves the document to
    // `mdschema` rather than inventing a verdict.
    expect(rootHeadingPattern("rules:\n  - something: else\n")).toBeNull();
  });

  it("skips a heading inside a fenced block", () => {
    // A `# comment` in a shell example is not the document's heading, and
    // reading one as the heading reports the document against a line it does
    // not have.
    const text = ["```sh", "# not a heading", "```", "", "# The Real Heading", ""].join("\n");

    expect(firstHeading(text)).toBe("# The Real Heading");
  });

  it("skips front matter", () => {
    const text = ["---", "title: something", "---", "", "# The Real Heading", ""].join("\n");

    expect(firstHeading(text)).toBe("# The Real Heading");
  });

  it("answers null when the document has no heading", () => {
    expect(firstHeading("Just a paragraph.\n")).toBeNull();
  });
});
