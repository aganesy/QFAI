/**
 * Spawn-based tests for `scripts/check-mdschema.mjs`.
 *
 * The driver's contract:
 *   - every in-scope document conforms          -> exit 0
 *   - any document violates its schema          -> exit 1, naming the document type
 *   - any document carries the opt-out marker   -> exit 1, naming the document
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
import { readFileSync, realpathSync } from "node:fs";
import type * as NodeFs from "node:fs";
import { link, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { storyTreeMarkdownPatterns } from "../../src/core/storyTree/layout.js";
import { createSymlinkFixture } from "../helpers/symlinkFixture.js";

// The IMPLEMENTATION, not the repository-root delegator: the delegator exits
// the process on load, so it exports nothing at all — importing it would end the
// test run during collection. The spawn cases below still address the delegator,
// because that is the path `pnpm lint:mdschema` and CI invoke.
// @ts-expect-error -- a plain .mjs guard with no type declarations
import {
  main,
  IGNORE_MARKER,
  documentsWithoutOneEntry,
  findMdschemaCommand,
  firstHeading,
  carriesIgnoreMarker,
  checkDocuments,
  parseViolations,
  patternToRegExp,
  explainForbiddenText,
  sectionDescriptions,
  rootHeadingPattern,
} from "../../assets/scripts/check-mdschema.mjs";

type FaultOperation = "lstat" | "readdir" | "readFile";

const unsafeReads = vi.hoisted(
  (): {
    active: boolean;
    paths: string[];
    faults: { operation: FaultOperation; file: string; code: string }[];
  } => ({
    active: false,
    paths: [],
    faults: [],
  }),
);

// Record actual destinations while preserving native filesystem operations. A
// registered fault makes one operation on one path fail with the given code, the
// way the operating system reports a denied, failing or exhausted read.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>();
  const failWhenFaulted = (operation: FaultOperation, target: unknown): void => {
    const fault = unsafeReads.faults.find(
      (candidate) =>
        candidate.operation === operation &&
        typeof target === "string" &&
        path.resolve(candidate.file) === path.resolve(target),
    );
    if (fault === undefined) return;
    throw Object.assign(
      new Error(`${fault.code}: injected failure, ${operation} '${fault.file}'`),
      {
        code: fault.code,
      },
    );
  };
  return {
    ...actual,
    lstatSync: (...args: Parameters<typeof actual.lstatSync>) => {
      failWhenFaulted("lstat", args[0]);
      return actual.lstatSync(...args);
    },
    statSync: (...args: Parameters<typeof actual.statSync>) => {
      if (unsafeReads.active) unsafeReads.paths.push(actual.realpathSync(args[0]));
      return actual.statSync(...args);
    },
    readdirSync: (...args: Parameters<typeof actual.readdirSync>) => {
      failWhenFaulted("readdir", args[0]);
      if (unsafeReads.active) unsafeReads.paths.push(actual.realpathSync(args[0]));
      return actual.readdirSync(...args);
    },
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) => {
      failWhenFaulted("readFile", args[0]);
      if (unsafeReads.active && typeof args[0] !== "number") {
        unsafeReads.paths.push(actual.realpathSync(args[0]));
      }
      return actual.readFileSync(...args);
    },
  };
});

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
  await writeFile(
    path.join(dir, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/specs\n  contractsDir: .qfai/contracts\n",
    "utf-8",
  );
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

/**
 * A `business-flow.md` that satisfies its schema: the shipped template, read
 * rather than restated, so a change to the pair moves this fixture with it.
 */
const CONFORMING_FLOW = readFileSync(
  path.join(
    REPO_ROOT,
    "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN/business-flow.md",
  ),
  "utf-8",
).replace(/\r\n/g, "\n");

/** The same document with its `## Flow` section removed. */
const NON_CONFORMING_FLOW = CONFORMING_FLOW.replace(/^## Flow\n[\s\S]*?(?=^## |(?![\s\S]))/m, "");

/** The same document with only its root heading replaced, sections intact. */
const WRONG_ROOT = CONFORMING_FLOW.replace(/^# .*$/m, "# Something Else Entirely");

async function writeFlow(root: string, flow: string, body: string): Promise<string> {
  const dir = path.join(root, ".qfai", "specs", "02_business-flow", flow);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "business-flow.md"), body, "utf-8");
  return `.qfai/specs/02_business-flow/${flow}/business-flow.md`;
}

describe("check-mdschema driver", () => {
  it("uses the story-tree directories without a config file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-defaults-"));
    tempDirs.push(root);
    const file = path.join(root, ".qfai", "spec", "03_contract", "tech.md");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "# Wrong root\n", "utf-8");

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("story-tech");
  });

  // QFAI:EX-0001-0011-01
  // QFAI:EX-0001-0011-02
  it("gives every fixed story-tree document and a CLI contract one schema entry", () => {
    const manifest = readFileSync(
      path.join(REPO_ROOT, "packages/qfai/assets/mdschema/manifest.yml"),
      "utf-8",
    );
    const files = [
      ...storyTreeMarkdownPatterns("docs/spec", "docs/contracts"),
      "docs/contracts/cli/example.md",
      "docs/spec/decisions/page-0001.md",
    ];

    expect(
      documentsWithoutOneEntry(manifest, files, {
        specsDir: "docs/spec",
        contractsDir: "docs/contracts",
      }),
    ).toEqual([]);
    const withoutOpenQuestions = manifest.replace(
      / {2}- id: story-open-questions\r?\n {4}schema: [^\r\n]+\r?\n {4}pattern: [^\r\n]+\r?\n/,
      "",
    );
    expect(
      documentsWithoutOneEntry(withoutOpenQuestions, files, {
        specsDir: "docs/spec",
        contractsDir: "docs/contracts",
      }),
    ).toEqual(["docs/spec/open-questions.md"]);
  });

  // QFAI:EX-0001-0011-14
  it("finds only files with zero or several manifest entries", () => {
    const manifest = [
      "documents:",
      "  - id: decision",
      "    schema: story/decisions.mdschema.yml",
      '    pattern: "{specsDir}/decisions.md"',
      "  - id: decision-other",
      "    schema: story/decisions.mdschema.yml",
      '    pattern: "{specsDir}/decisions.md"',
      "  - id: contract",
      "    schema: story/03_contract/tech.mdschema.yml",
      '    pattern: "{contractsDir}/tech.md"',
    ].join("\n");
    expect(
      documentsWithoutOneEntry(
        manifest,
        ["docs/spec/decisions.md", "docs/spec/open-questions.md", "docs/contracts/tech.md"],
        { specsDir: "docs/spec", contractsDir: "docs/contracts" },
      ),
    ).toEqual(["docs/spec/decisions.md", "docs/spec/open-questions.md"]);
  });

  // QFAI:EX-0001-0011-03
  it("checks a contract file at the configured contractsDir", async () => {
    const root = await newTempDir();
    const contract = path.join(root, "docs", "contracts", "tech.md");
    await mkdir(path.dirname(contract), { recursive: true });
    await writeFile(contract, "# Wrong root\n", "utf-8");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: docs/spec\n  contractsDir: docs/contracts\n",
      "utf-8",
    );

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("story-tech");

    const template = path.join(
      REPO_ROOT,
      "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md",
    );
    await writeFile(contract, readFileSync(template, "utf-8"), "utf-8");
    const valid = runDriver(["--root", root, "--scope", "all"]);
    expect(valid.status, valid.stderr).toBe(0);
  });

  it("exits 0 and counts the files when every document conforms", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", CONFORMING_FLOW);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 file(s) conform");
  });

  // QFAI:EX-0001-0011-04
  it("accepts a one-flow one-story sample copied from the SDD templates", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf-8",
    );
    const source = path.join(
      REPO_ROOT,
      "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN",
    );
    const destination = path.join(root, ".qfai/spec/02_business-flow/business-flow-0001");
    for (const relative of [
      "business-flow.md",
      "user-story-NNNN-NNNN/01_User-story.md",
      "user-story-NNNN-NNNN/02_Acceptance-Criteria.md",
      "user-story-NNNN-NNNN/03_Example.md",
    ]) {
      const target = path.join(
        destination,
        relative.replace("user-story-NNNN-NNNN", "user-story-0001-0001"),
      );
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, readFileSync(path.join(source, relative), "utf-8"), "utf-8");
    }

    const result = runDriver(["--root", root, "--scope", "all"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("4 file(s) conform");
  });

  it("exits 1 and names the document type when a document violates its schema", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", NON_CONFORMING_FLOW);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    // The manifest entry id, so a reader knows which contract was broken
    // without matching the violation text against 22 schemas by eye.
    expect(result.stderr).toContain("story-business-flow");
    expect(result.stderr).toContain("Flow");
  });

  it("reports a per-document-type summary when asked", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", CONFORMING_FLOW);

    const result = runDriver(["--root", root, "--scope", "all", "--summary"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PASS");
    expect(result.stdout).toContain("story-business-flow");
  });

  it("checks only the named documents under --scope files", async () => {
    const root = await newTempDir();
    const good = await writeFlow(root, "business-flow-0001", CONFORMING_FLOW);
    await writeFlow(root, "business-flow-0002", NON_CONFORMING_FLOW);

    const result = runDriver(["--root", root, "--scope", "files", good]);

    // The broken pack exists and is deliberately out of scope: a `files` run
    // that widened to the tree would make the flag meaningless.
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 file(s) conform");
  });

  it("fails open to the whole tree when the git base is unreachable", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", NON_CONFORMING_FLOW);

    // A temp directory is not a git repository, so the diff is degraded. The
    // lane must widen rather than silently check nothing and report green —
    // that would claim a result it never established.
    const result = runDriver(["--root", root, "--base", "no/such/ref"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("story-business-flow");
  });

  it("reads paths.specsDir from the tree's own qfai.config.yaml", async () => {
    const root = await newTempDir();
    const dir = path.join(root, "docs", "specs", "02_business-flow", "business-flow-0001");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "business-flow.md"), NON_CONFORMING_FLOW, "utf-8");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: docs/specs\n  outDir: .qfai/report\n",
      "utf-8",
    );

    const result = runDriver(["--root", root, "--scope", "all"]);

    // Found at the relocated path: an adopter who moved their specs is covered
    // without editing the manifest.
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("story-business-flow");
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

  // QFAI:EX-0002-0003-08
  it("exits 2 when --tools names no directory", async () => {
    const root = await newTempDir();

    const result = runDriver(["--root", root, "--scope", "all", "--tools"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--tools needs a directory");
  });

  // QFAI:EX-0002-0003-08
  it("exits 2 when --tools is followed by another option, which it must not swallow", async () => {
    const root = await newTempDir();

    const result = runDriver(["--root", root, "--tools", "--scope", "all"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--tools needs a directory");
  });

  it("exits 2 when --scope files is given no path", async () => {
    const root = await newTempDir();

    const result = runDriver(["--root", root, "--scope", "files"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("at least one path");
  });
});

describe("a Markdown file no schema covers", () => {
  // QFAI:EX-0001-0011-12
  it("fails the lane under every scope that includes it, naming the file", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", CONFORMING_FLOW);
    const notes = ".qfai/contracts/design/notes.md";
    await mkdir(path.dirname(path.join(root, notes)), { recursive: true });
    await writeFile(path.join(root, notes), "# Notes\n", "utf-8");

    const all = runDriver(["--root", root, "--scope", "all"]);
    expect(all.status).toBe(1);
    expect(all.stderr).toContain(notes);
    expect(all.stderr).toContain("no schema covers this document");

    const named = runDriver(["--root", root, "--scope", "files", notes]);
    expect(named.status).toBe(1);
    expect(named.stderr).toContain(notes);

    const other = runDriver([
      "--root",
      root,
      "--scope",
      "files",
      ".qfai/specs/02_business-flow/business-flow-0001/business-flow.md",
    ]);
    expect(other.status, other.stderr).toBe(0);
  });

  // QFAI:EX-0001-0011-15
  it.each([
    ["a leading ./", "./.qfai/specs", "./.qfai/contracts/"],
    ["backslashes", ".qfai\\specs", ".qfai\\contracts\\"],
  ])(
    "reads configured directories spelled with %s as the same tree",
    async (_, specs, contracts) => {
      const root = await newTempDir();
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        `paths:\n  specsDir: ${specs}\n  contractsDir: ${contracts}\n`,
        "utf-8",
      );
      await writeFlow(root, "business-flow-0001", CONFORMING_FLOW);

      const result = runDriver(["--root", root, "--scope", "all"]);

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("1 file(s) conform");
      expect(checkDocuments(root)).toEqual({ ok: true, checked: 1, violations: [] });
    },
  );

  it("is returned to a caller as a coverage violation", async () => {
    const root = await newTempDir();
    const notes = ".qfai/specs/README.md";
    await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });
    await writeFile(path.join(root, notes), "# Readme\n", "utf-8");

    expect(checkDocuments(root)).toEqual({
      ok: true,
      checked: 0,
      violations: [expect.objectContaining({ file: notes, rule: "coverage", line: 1 })],
    });
  });
});

describe("a document that carries the opt-out marker", () => {
  // QFAI:EX-0001-0011-07
  it("is refused and reported, however well it conforms", async () => {
    const root = await newTempDir();
    const file = await writeFlow(
      root,
      "business-flow-0001",
      `${IGNORE_MARKER}\n\n${CONFORMING_FLOW}`,
    );

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(file);
    expect(result.stderr).toContain("is not accepted");
  });

  it("is still graded against its schema", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", `${IGNORE_MARKER}\n\n${NON_CONFORMING_FLOW}`);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("is not accepted");
    expect(result.stderr).toContain("Flow");
  });

  it("is not read from a mention below the content", async () => {
    const root = await newTempDir();
    // The mention sits after the first section's prose, where the schema allows a
    // paragraph, so the document conforms and only the marker's position is tested.
    await writeFlow(
      root,
      "business-flow-0001",
      CONFORMING_FLOW.replace(/^## Flow$/m, `${IGNORE_MARKER}\n\n## Flow`),
    );

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status, result.stderr).toBe(0);
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
    expect(carriesIgnoreMarker(text)).toBe(expected);
  });

  it("reads only the marker itself, not a line that carries it", () => {
    // A line mentioning the marker — a document explaining the convention — is
    // not a document using it.
    expect(carriesIgnoreMarker(`${IGNORE_MARKER} for a deleted pack\n`)).toBe(false);
    expect(carriesIgnoreMarker(`Write ${IGNORE_MARKER} at the top.\n`)).toBe(false);
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

  // QFAI:EX-0002-0003-08
  it("prefers the installation in the tools directory over the tree's own", async () => {
    // The shipped document lane installs the checker into a directory of its own
    // and names it with `--tools`; that copy is the one the lane pinned.
    const root = await newTempDir();
    const tools = await newTempDir();
    await seedPackage(root, { mdschema: "bin/cli.js" });
    const pinned = await seedPackage(tools, { mdschema: "bin/cli.js" });

    expect(findMdschemaCommand(root, tools)).toEqual({ command: process.execPath, args: [pinned] });
  });

  // QFAI:EX-0002-0003-08
  it("falls back to the tree's own installation when the tools directory holds none", async () => {
    const root = await newTempDir();
    const tools = await newTempDir();
    const entry = await seedPackage(root, { mdschema: "bin/cli.js" });

    expect(findMdschemaCommand(root, tools)?.args).toEqual([entry]);
  });

  // QFAI:EX-0002-0003-08
  it("ignores a bin that points outside its own package", async () => {
    const root = await newTempDir();
    const tools = await newTempDir();
    const entry = await seedPackage(root, { mdschema: "bin/cli.js" });
    const packageDir = path.join(tools, "node_modules", "@jackchuka", "mdschema");
    await mkdir(packageDir, { recursive: true });
    const outside = path.join(tools, "node_modules", "@jackchuka", "outside.js");
    await writeFile(outside, "", "utf-8");
    await writeFile(
      path.join(packageDir, "package.json"),
      JSON.stringify({ name: "@jackchuka/mdschema", bin: { mdschema: "../outside.js" } }),
      "utf-8",
    );

    expect(findMdschemaCommand(root, tools)?.args).toEqual([entry]);
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
    git(root, "config", "core.autocrlf", "false");
    git(root, "config", "user.email", "lane@example.com");
    git(root, "config", "user.name", "lane");
    for (const [pack, body] of Object.entries(base)) {
      await writeFlow(root, pack, body);
    }
    git(root, "add", "-A");
    git(root, "commit", "-qm", "base");
    git(root, "checkout", "-q", "-b", "work");
    for (const [pack, body] of Object.entries(head)) {
      await writeFlow(root, pack, body);
    }
    git(root, "add", "-A");
    git(root, "commit", "-qm", "head");
    return root;
  }

  /** The same legacy document at both revisions, one line longer at the head. */
  const LEGACY = "# flow: a heading the schema does not accept\n\n## Metadata\n\n- something\n";
  const LEGACY_EDITED = `${LEGACY}- one more line\n`;

  it("leaves a pre-existing failure to its own change when a branch edits the document", async () => {
    const root = await twoCommits(
      { "business-flow-0002": LEGACY },
      { "business-flow-0002": LEGACY_EDITED },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no new violations");
    expect(result.stdout).toContain("already failing at the merge base");
  });

  it("reports the inherited failure rather than dropping it", async () => {
    // Held back is not the same as hidden. A document nobody is told about is
    // one nobody migrates, which is the backlog this flag exists to let shrink.
    const root = await twoCommits(
      { "business-flow-0002": LEGACY },
      { "business-flow-0002": LEGACY_EDITED },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main", "--summary"]);

    expect(result.stdout).toContain("pre-existing, not this branch's");
    expect(result.stdout).toContain("business-flow.md");
    expect(result.stdout).toContain("PASS  story-business-flow (1 file(s), 1 pre-existing)");
  });

  it("fails when a branch breaks a document that conformed at the merge base", async () => {
    const root = await twoCommits(
      { "business-flow-0001": CONFORMING_FLOW },
      { "business-flow-0001": NON_CONFORMING_FLOW },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("story-business-flow");
  });

  it("fails when a branch adds a document that does not conform", async () => {
    // Absent at the base is not "was already failing". This is the first run
    // that could have reported it.
    const root = await twoCommits(
      { "business-flow-0001": CONFORMING_FLOW },
      { "business-flow-0003": LEGACY },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
  });

  it("still fails for what the branch owes when it also edits a legacy document", async () => {
    const root = await twoCommits(
      { "business-flow-0001": CONFORMING_FLOW, "business-flow-0002": LEGACY },
      { "business-flow-0001": NON_CONFORMING_FLOW, "business-flow-0002": LEGACY_EDITED },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
    // The two are separated by where they are printed: what this branch owes
    // goes to stderr with the failure, the inherited one to stdout without it.
    expect(result.stderr).toContain("business-flow-0001");
    expect(result.stderr).not.toContain("business-flow-0002");
    expect(result.stdout).toContain("business-flow-0002");
  });

  it("refuses the opt-out marker even where the merge base carried it", async () => {
    const marked = `${IGNORE_MARKER}\n\n${CONFORMING_FLOW}`;
    const root = await twoCommits(
      { "business-flow-0001": marked },
      { "business-flow-0001": `${marked}\nOne more paragraph.\n` },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("is not accepted");
  });

  it("holds every violation against --scope all, which is the migration view", async () => {
    const root = await twoCommits(
      { "business-flow-0002": LEGACY },
      { "business-flow-0002": LEGACY_EDITED },
    );

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain("pre-existing");
  });

  it("leaves a root heading already wrong at the merge base to its own change", async () => {
    // The root-heading verdict is taken without `mdschema`, so it needs its own
    // answer to the ownership question the ratchet asks of everything else.
    const root = await twoCommits(
      { "business-flow-0002": WRONG_ROOT },
      { "business-flow-0002": `${WRONG_ROOT}- one more line\n` },
    );

    const result = runDriver(["--root", root, "--scope", "changed", "--base", "main"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("pre-existing");
    expect(result.stdout).toContain("Root heading is");
  });

  it("fails when a branch breaks a root heading that matched at the merge base", async () => {
    const root = await twoCommits(
      { "business-flow-0001": CONFORMING_FLOW },
      { "business-flow-0001": WRONG_ROOT },
    );

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
      { "business-flow-0002": LEGACY },
      { "business-flow-0002": LEGACY.replace(/\n/g, "\r\n") },
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
      { "business-flow-0002": LEGACY },
      { "business-flow-0002": LEGACY.replace("- something", "  - something") },
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
    await writeFlow(root, "business-flow-0001", WRONG_ROOT);

    const result = runDriver(["--root", root, "--scope", "all"]);
    const marks = (result.stderr.match(/✗/g) ?? []).length;

    // The document carries several sections under its root.
    expect(result.status).toBe(1);
    expect(marks).toBe(1);
  });

  it("names what is there and what the schema requires", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", WRONG_ROOT);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.stderr).toContain('"# Something Else Entirely"');
    expect(result.stderr).toContain("^# BF-");
  });

  it("says the document is not checked further", async () => {
    // Without that line a reader takes the absence of other violations for the
    // rest of the document being sound.
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", WRONG_ROOT);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.stderr).toContain("not checked further");
  });

  it("says so for a document with no heading at all", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", "Just a paragraph, no heading.\n");

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("no heading");
  });

  it("still grades a document whose root heading matches", async () => {
    // The short-circuit is scoped to the one condition that makes grading
    // meaningless. Everything else is still `mdschema`'s to answer.
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", NON_CONFORMING_FLOW);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("Root heading is");
    expect(result.stderr).toContain("Flow");
  });

  it("reports both kinds in one run, each from its own source", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", WRONG_ROOT);
    await writeFlow(root, "business-flow-0002", NON_CONFORMING_FLOW);

    const result = runDriver(["--root", root, "--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Root heading is");
    expect(result.stderr).toContain("Flow");
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

/**
 * The same check, for a caller rather than a log.
 *
 * `qfai validate` reports what `checkDocuments` returns, so it has to return
 * each violation with the document and the line it is on.
 */
describe("checking documents for a caller", () => {
  it("returns each violation with its document and line", async () => {
    const root = await newTempDir();
    const file = await writeFlow(root, "business-flow-0001", NON_CONFORMING_FLOW);

    const result = checkDocuments(root);

    expect(result.ok).toBe(true);
    expect(result.checked).toBe(1);
    expect(result.violations.length).toBeGreaterThan(0);
    for (const violation of result.violations) {
      expect(violation.file).toBe(file);
      expect(violation.line).toBeGreaterThan(0);
      expect(violation.rule).not.toBe("");
    }
    expect(result.violations.map((v: { message: string }) => v.message).join("\n")).toContain(
      "Flow",
    );
  });

  it("returns no violation for a conforming tree", async () => {
    const root = await newTempDir();
    await writeFlow(root, "business-flow-0001", CONFORMING_FLOW);

    expect(checkDocuments(root)).toEqual({ ok: true, checked: 1, violations: [] });
  });

  it("returns the refused marker and the root heading as violations of their own", async () => {
    const root = await newTempDir();
    const marked = await writeFlow(
      root,
      "business-flow-0001",
      `${IGNORE_MARKER}\n\n${CONFORMING_FLOW}`,
    );
    const wrong = await writeFlow(root, "business-flow-0002", WRONG_ROOT);

    const result = checkDocuments(root);

    expect(result.violations).toEqual([
      expect.objectContaining({ file: marked, rule: "ignore", line: 1 }),
      expect.objectContaining({ file: wrong, rule: "structure", line: 1 }),
    ]);
  });

  it("uses the roots it is given rather than the config file", async () => {
    const root = await newTempDir();
    const dir = path.join(root, "docs", "02_business-flow", "business-flow-0001");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "business-flow.md"), NON_CONFORMING_FLOW, "utf-8");

    const result = checkDocuments(root, { specsDir: "docs", contractsDir: "docs/03_contract" });

    expect(result.ok).toBe(true);
    expect(result.violations.map((v: { file: string }) => v.file)).toContain(
      "docs/02_business-flow/business-flow-0001/business-flow.md",
    );
  });
});

describe("reading mdschema's output", () => {
  const root = path.resolve(os.tmpdir(), "tree");
  const file = ".qfai/spec/decisions.md";
  const output = [
    path.join(root, file),
    '  ✗ 1:3 [structure] Required element "^## Decisions$" not found within "Decisions"',
    '  ✗ 3:4 [structure] First heading under "Decisions" is "## Wrong"',
    "",
    "✗ Found 2 violation(s) in 1 file(s)",
  ].join("\n");

  it("attributes each violation line to the document above it", () => {
    const parsed = parseViolations(output, [file], root);

    expect(parsed.unattributed).toEqual([]);
    expect(parsed.perFile.get(file)).toEqual([
      {
        line: 1,
        column: 3,
        rule: "structure",
        message: 'Required element "^## Decisions$" not found within "Decisions"',
      },
      {
        line: 3,
        column: 4,
        rule: "structure",
        message: 'First heading under "Decisions" is "## Wrong"',
      },
    ]);
  });

  it("keeps a line it cannot place rather than dropping it", () => {
    const parsed = parseViolations(`${output}\nsomething new the tool printed`, [file], root);

    expect(parsed.unattributed).toEqual(["something new the tool printed"]);
  });
});

describe("a forbidden-text finding", () => {
  const TECH_SCHEMA = readFileSync(
    path.join(REPO_ROOT, "packages/qfai/assets/mdschema/story/03_contract/tech.mdschema.yml"),
    "utf-8",
  );
  const TECH_TEMPLATE = readFileSync(
    path.join(
      REPO_ROOT,
      "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md",
    ),
    "utf-8",
  ).replace(/\r\n/g, "\n");
  const PROSE_DEPENDENCIES = TECH_TEMPLATE.replace(
    /^- `<package>`\n {2}- `<what the project uses it for>`\n/m,
    "- some prose\n",
  );
  const DESCRIPTION =
    "Each runtime dependency with the reason for it on a nested item, or `- None.`";
  const first = "(?m)^- [^`N]";
  const second = String.raw`(?m)^- N(?:[^o\n]|o[^n\n])`;
  const lineOf = (pattern: string): string =>
    `  ✗ 43:4 [forbidden-text] Forbidden text '${pattern}' found in section 'Dependencies'`;

  async function writeTech(root: string, body: string): Promise<string> {
    const dir = path.join(root, ".qfai", "contracts");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "tech.md"), body, "utf-8");
    return ".qfai/contracts/tech.md";
  }

  it("reads the description of each heading, however the schema writes it", () => {
    const entries = sectionDescriptions(TECH_SCHEMA);

    expect(entries.find((entry) => entry.pattern === "^## Dependencies$")?.description).toBe(
      DESCRIPTION,
    );
    const architecture = entries.find((entry) => entry.pattern === "^## Architecture$");
    expect(architecture?.description.startsWith("The layers the code is divided into.")).toBe(true);
    expect(architecture?.description).not.toContain("\n");
  });

  it("states what the section holds in place of the pattern", () => {
    const explained = explainForbiddenText(lineOf(first), TECH_SCHEMA);

    expect(explained).toBe(
      `  ✗ 43:4 [forbidden-text] Section 'Dependencies' does not hold what the schema requires: ${DESCRIPTION}`,
    );
    expect(explained).not.toContain("(?m)");
  });

  it("is one finding for the patterns that fail at one position, and the tally follows", () => {
    const output = [
      "C:\tree\tech.md",
      lineOf(first),
      lineOf(second),
      '  ✗ 50:1 [structure] Required element "^## Stack$" not found within "Technology"',
      "",
      "✗ Found 3 violation(s) in 1 file(s)",
    ].join("\n");

    const lines = explainForbiddenText(output, TECH_SCHEMA).split("\n");

    expect(lines.filter((line) => line.includes("[forbidden-text]"))).toHaveLength(1);
    expect(lines.at(-1)).toBe("✗ Found 2 violation(s) in 1 file(s)");
  });

  it("keeps two documents' findings at the same position apart", () => {
    const output = ["a.md", lineOf(first), "b.md", lineOf(first)].join("\n");

    expect(
      explainForbiddenText(output, TECH_SCHEMA)
        .split("\n")
        .filter((line) => line.includes("[forbidden-text]")),
    ).toHaveLength(2);
  });

  it("keeps the pattern where the schema gives the section no description", () => {
    const output = lineOf(first).replace("'Dependencies'", "'Unknown section'");

    expect(explainForbiddenText(output, TECH_SCHEMA)).toBe(output);
  });

  it("is reported by the lane as the rule, and as the pattern behind --show-patterns", async () => {
    const root = await newTempDir();
    const file = await writeTech(root, PROSE_DEPENDENCIES);

    const explained = runDriver(["--root", root, "--scope", "files", file]);
    const raw = runDriver(["--root", root, "--scope", "files", "--show-patterns", file]);

    expect(explained.status).toBe(1);
    expect(explained.stderr).toContain(`does not hold what the schema requires: ${DESCRIPTION}`);
    expect(explained.stderr).not.toContain("Forbidden text");
    expect(raw.stderr).toContain("Forbidden text '(?m)^- [^`N]'");
    expect(raw.stderr).not.toContain("does not hold what the schema requires");
  });

  it("is returned to a caller as the rule", async () => {
    const root = await newTempDir();
    await writeTech(root, PROSE_DEPENDENCIES);

    const result = checkDocuments(root, {
      specsDir: ".qfai/specs",
      contractsDir: ".qfai/contracts",
    });

    const messages: string[] = result.violations
      .filter((v: { rule: string }) => v.rule === "forbidden-text")
      .map((v: { message: string }) => v.message);
    expect(messages).toEqual([
      `Section 'Dependencies' does not hold what the schema requires: ${DESCRIPTION}`,
    ]);
  });
});

describe("the configured decision register", () => {
  const table =
    "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
  const indexed = table.replace(
    "## Decisions",
    "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
  );

  // QFAI:EX-0001-0011-17
  it("routes a listed page and its append tail through the configured root", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai", "specs", "decisions"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "specs", "decisions.md"), indexed, "utf-8");
    await writeFile(path.join(root, ".qfai", "specs", "decisions", "page-0001.md"), table, "utf-8");
    const result = runDriver(["--root", root, "--scope", "all"]);
    expect(result.status, result.stderr).toBe(0);
    expect(checkDocuments(root)).toEqual({ ok: true, checked: 2, violations: [] });
  });

  // QFAI:EX-0001-0011-18
  it.each([
    ["duplicate", "- decisions/page-0001.md\n- decisions/page-0001.md"],
    ["traversal", "- decisions/../page-0001.md"],
    ["nested", "- decisions/nested/page-0001.md"],
    ["backslash", "- decisions\\page-0001.md"],
    ["annotation", "- decisions/page-0001.md retained"],
    ["prose", "Read the archived page below."],
  ])("refuses a %s page-list entry", async (_, entry) => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai", "specs", "decisions"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "specs", "decisions.md"),
      indexed.replace("- decisions/page-0001.md", entry),
      "utf-8",
    );
    await writeFile(path.join(root, ".qfai", "specs", "decisions", "page-0001.md"), table, "utf-8");
    const result = runDriver(["--root", root, "--scope", "all"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[decision-register]");
    expect(checkDocuments(root).violations).toContainEqual(
      expect.objectContaining({ rule: "decision-register" }),
    );
  });

  it.each(["missing", "unlisted", "hard-linked"])("refuses a %s physical page", async (kind) => {
    const root = await newTempDir();
    const dir = path.join(root, ".qfai", "specs", "decisions");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(root, ".qfai", "specs", "decisions.md"), indexed, "utf-8");
    if (kind !== "missing") await writeFile(path.join(dir, "page-0001.md"), table, "utf-8");
    if (kind === "unlisted") await writeFile(path.join(dir, "page-0002.md"), table, "utf-8");
    if (kind === "hard-linked") {
      await link(path.join(dir, "page-0001.md"), path.join(root, "page-copy.md"));
    }
    const result = runDriver(["--root", root, "--scope", "all"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[decision-register]");
    expect(checkDocuments(root).violations).toContainEqual(
      expect.objectContaining({ rule: "decision-register" }),
    );
  });

  it.each<[string, number, boolean]>([
    ["root", 500, true],
    ["root", 501, true],
    ["root", 500, false],
    ["page", 500, true],
    ["page", 501, true],
    ["page", 500, false],
  ])(
    "counts %s %i physical lines with final newline %s inclusively",
    async (kind, count, finalNewline) => {
      const root = await newTempDir();
      const dir = path.join(root, ".qfai", "specs", "decisions");
      await mkdir(dir, { recursive: true });
      const document = table + "\n".repeat(count - 6);
      const bytes = finalNewline ? document : document.slice(0, -1) + " ";
      await writeFile(
        path.join(root, ".qfai", "specs", "decisions.md"),
        kind === "root" ? bytes : indexed,
        "utf-8",
      );
      if (kind === "page") await writeFile(path.join(dir, "page-0001.md"), bytes, "utf-8");
      const result = runDriver(["--root", root, "--scope", "all"]);
      const findings = checkDocuments(root).violations;
      expect(result.status, result.stderr).toBe(count > 500 ? 1 : 0);
      if (count > 500) {
        expect(result.stderr).toContain("at most 500 physical lines; found 501");
        expect(findings).toContainEqual(expect.objectContaining({ rule: "decision-register" }));
      } else {
        expect(findings).toEqual([]);
      }
    },
  );

  it("checks the complete inventory only when the register is in scope", async () => {
    const root = await newTempDir();
    const dir = path.join(root, ".qfai", "specs", "decisions");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(root, ".qfai", "specs", "decisions.md"), indexed, "utf-8");
    await writeFile(path.join(dir, "page-0001.md"), table, "utf-8");
    await writeFile(path.join(dir, "page-0002.md"), table, "utf-8");
    const flow = await writeFlow(root, "business-flow-0001", CONFORMING_FLOW);
    expect(runDriver(["--root", root, "--scope", "files", flow]).status).toBe(0);
    const result = runDriver(["--root", root, "--scope", "files", ".qfai/specs/decisions.md"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("page-0002.md");
  });
});

describe("unsafe decision-register read boundary", () => {
  // QFAI:EX-0001-0053-29
  it("stops at a linked specs root configured with backslashes", async (context) => {
    const root = await newTempDir();
    const outside = await newTempDir();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      'paths:\n  specsDir: ".qfai\\\\specs"\n  contractsDir: .qfai/contracts\n',
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai"));
    await writeFile(
      path.join(outside, "decisions.md"),
      "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n",
      "utf-8",
    );
    await writeFile(path.join(outside, "sentinel.md"), "# Outside sentinel must not be graded\n");
    if (!(await createSymlinkFixture(outside, path.join(root, ".qfai", "specs"), "dir"))) {
      context.skip();
      return;
    }

    const actualOutside = realpathSync(outside);
    unsafeReads.paths.length = 0;
    unsafeReads.active = true;
    try {
      const result = checkDocuments(root);
      expect(result.ok).toBe(true);
      expect(result.checked).toBe(0);
      expect(result.violations).toEqual([
        expect.objectContaining({
          file: ".qfai/specs",
          rule: "decision-register",
          message: expect.stringContaining("not links"),
        }),
      ]);
      expect(
        unsafeReads.paths.filter(
          (file) => file === actualOutside || file.startsWith(actualOutside + path.sep),
        ),
      ).toEqual([]);
    } finally {
      unsafeReads.active = false;
    }
  });

  // QFAI:EX-0001-0053-29
  it.each([
    ["specs root", "API"],
    ["specs root", "CLI"],
    ["decisions root", "API"],
    ["decisions root", "CLI"],
    ["pages directory", "API"],
    ["pages directory", "CLI"],
    ["listed page", "API"],
    ["listed page", "CLI"],
  ])(
    "stops before reading the linked %s destination through the %s",
    async (kind, consumer, context) => {
      const root = await newTempDir();
      const outside = await newTempDir();
      const specs = path.join(root, ".qfai", "specs");
      await mkdir(path.dirname(specs), { recursive: true });
      const sentinel = path.join(outside, "sentinel.md");
      const table =
        "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
      await writeFile(sentinel, "# Outside sentinel must not be graded\n", "utf-8");

      let target = sentinel;
      let linkPath = path.join(specs, "decisions.md");
      let directory = false;
      if (kind === "specs root") {
        await writeFile(path.join(outside, "decisions.md"), table, "utf-8");
        target = outside;
        linkPath = specs;
        directory = true;
      } else {
        await mkdir(specs, { recursive: true });
        if (kind === "pages directory" || kind === "listed page") {
          await writeFile(
            path.join(specs, "decisions.md"),
            table.replace(
              "## Decisions",
              "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
            ),
            "utf-8",
          );
          if (kind === "pages directory") {
            await writeFile(path.join(outside, "page-0001.md"), table, "utf-8");
            target = outside;
            linkPath = path.join(specs, "decisions");
            directory = true;
          } else {
            await mkdir(path.join(specs, "decisions"));
            linkPath = path.join(specs, "decisions", "page-0001.md");
          }
        }
      }
      if (!(await createSymlinkFixture(target, linkPath, directory ? "dir" : "file"))) {
        context.skip();
        return;
      }

      const actualOutside = realpathSync(outside);
      const argv = process.argv;
      const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const stdout = vi.spyOn(console, "log").mockImplementation(() => undefined);
      unsafeReads.paths.length = 0;
      unsafeReads.active = true;
      try {
        if (consumer === "API") {
          const result = checkDocuments(root);
          expect(result.ok).toBe(true);
          expect(result.checked).toBe(0);
          expect(result.violations).toEqual(
            expect.arrayContaining([expect.objectContaining({ rule: "decision-register" })]),
          );
        } else {
          process.argv = ["node", SCRIPT, "--root", root, "--scope", "all"];
          expect(main()).toBe(1);
          expect(stderr.mock.calls.flat().join("\n")).toContain("[decision-register]");
        }
        expect(
          unsafeReads.paths.filter(
            (file) => file === actualOutside || file.startsWith(actualOutside + path.sep),
          ),
        ).toEqual([]);
      } finally {
        unsafeReads.active = false;
        process.argv = argv;
        stderr.mockRestore();
        stdout.mockRestore();
      }
    },
  );
});

describe("decision-register filesystem causes", () => {
  const table =
    "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
  const indexed = table.replace(
    "## Decisions",
    "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
  );
  const codes = ["EACCES", "EIO", "EMFILE"];

  async function paged(): Promise<{ root: string; page: string }> {
    const root = await newTempDir();
    const specs = path.join(root, ".qfai", "specs");
    const pagesDir = path.join(specs, "decisions");
    await mkdir(pagesDir, { recursive: true });
    await writeFile(path.join(specs, "decisions.md"), indexed, "utf-8");
    await writeFile(path.join(pagesDir, "page-0001.md"), table, "utf-8");
    return { root, page: path.join(pagesDir, "page-0001.md") };
  }

  afterEach(() => {
    unsafeReads.faults.length = 0;
  });

  const failures: [string, FaultOperation, string, string][] = [
    ["inspect the root document", "lstat", "Cannot inspect", ".qfai/specs/decisions.md"],
    ["read the root document", "readFile", "Cannot read", ".qfai/specs/decisions.md"],
    ["list the pages directory", "readdir", "Cannot list", ".qfai/specs/decisions"],
    ["read a listed page", "readFile", "Cannot read", ".qfai/specs/decisions/page-0001.md"],
    ["inspect a listed page", "lstat", "Cannot inspect", ".qfai/specs/decisions/page-0001.md"],
  ];

  // QFAI:EX-0001-0053-29
  it.each(
    failures.flatMap((failure) =>
      codes.map((code): [...typeof failure, string] => [...failure, code]),
    ),
  )(
    "names the failure when it cannot %s (%s, %s, %s, %s)",
    async (_, operation, prefix, relative, code) => {
      const { root } = await paged();
      unsafeReads.faults.push({ operation, file: path.join(root, ...relative.split("/")), code });
      const result = checkDocuments(root);
      expect(result.ok).toBe(true);
      expect(result.checked).toBe(0);
      expect(result.violations).toEqual([
        expect.objectContaining({
          file: relative,
          rule: "decision-register",
          message: expect.stringContaining(prefix),
        }),
      ]);
      const message: string = result.violations[0].message;
      expect(message).toContain(`(${code})`);
      expect(message).not.toContain("injected failure");
      expect(message).not.toContain(root);
      for (const other of codes.filter((candidate) => candidate !== code)) {
        expect(message).not.toContain(other);
      }
    },
  );

  // QFAI:EX-0001-0053-29
  it("keeps a listed page that inspection finds absent as a missing page, not an access failure", async () => {
    const { root, page } = await paged();
    unsafeReads.faults.push({ operation: "lstat", file: page, code: "ENOENT" });
    const result = checkDocuments(root);
    expect(result.ok).toBe(true);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        file: ".qfai/specs/decisions/page-0001.md",
        rule: "decision-register",
        message: "A listed decision page is missing; restore it before checking.",
      }),
    );
    const messages = result.violations.map((violation) => violation.message).join("\n");
    expect(messages).not.toContain("ENOENT");
    expect(messages).not.toContain("Cannot inspect");
  });

  const vanished: [string, FaultOperation, string, string][] = [
    ["read the root document", "readFile", "Cannot read", ".qfai/specs/decisions.md"],
    ["read a listed page", "readFile", "Cannot read", ".qfai/specs/decisions/page-0001.md"],
    ["list the pages directory", "readdir", "Cannot list", ".qfai/specs/decisions"],
  ];

  // QFAI:EX-0001-0053-29
  it.each(vanished)(
    "reports a path that vanishes after inspection as unsafe when it cannot %s",
    async (_, operation, prefix, relative) => {
      const { root } = await paged();
      unsafeReads.faults.push({
        operation,
        file: path.join(root, ...relative.split("/")),
        code: "ENOENT",
      });
      const result = checkDocuments(root);
      expect(result.ok).toBe(true);
      expect(result.checked).toBe(0);
      expect(result.violations).toEqual([
        expect.objectContaining({
          file: relative,
          rule: "decision-register",
          message: expect.stringContaining(prefix),
        }),
      ]);
      expect(result.violations[0].message).toContain("(ENOENT)");
      expect(result.violations[0].message).not.toContain(root);
    },
  );

  it("tells a denied read from a failing one in the command's output", async () => {
    const { root, page } = await paged();
    const argv = process.argv;
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const stdout = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      process.argv = ["node", SCRIPT, "--root", root, "--scope", "all"];
      const output: string[] = [];
      for (const code of ["EACCES", "EIO"]) {
        unsafeReads.faults.length = 0;
        unsafeReads.faults.push({ operation: "readFile", file: page, code });
        expect(main()).toBe(1);
        output.push(stderr.mock.calls.flat().join("\n"));
        stderr.mockClear();
      }
      expect(output[0]).toContain("(EACCES)");
      expect(output[0]).not.toContain("EIO");
      expect(output[1]).toContain("(EIO)");
      expect(output[1]).not.toContain("EACCES");
      for (const text of output) expect(text).not.toContain("injected failure");
    } finally {
      process.argv = argv;
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });
});
