import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import { defaultConfig } from "../../src/core/config.js";
import { readStoryTreeAtRef } from "../../src/core/storyTree/storyTreeAtRef.js";
import { nextStoryTreeId } from "../../src/core/storyTree/tree.js";
import { validateStoryTreeDrift } from "../../src/core/validators/upstreamSsotGuard.js";
import type * as GitChanges from "../../src/core/gitChanges.js";

const baseRead = vi.hoisted(() => ({ unreadable: false }));

// A base file git cannot show (past the output ceiling) cannot be built cheaply, so the read
// of the base is made to fail for the one test that needs it.
vi.mock("../../src/core/gitChanges.js", async (importOriginal) => {
  const original = await importOriginal<typeof GitChanges>();
  return {
    ...original,
    readFileAtBase: (...args: Parameters<typeof original.readFileAtBase>) =>
      baseRead.unreadable ? null : original.readFileAtBase(...args),
  };
});

let root: string;
const specs = ".qfai/spec";
const decisions = `${specs}/decisions.md`;
const glossary = `${specs}/01_policy/glossary.md`;
const table = "# Decisions\n\n## Decisions\n\n| ID | Content | Approach |\n| --- | --- | --- |\n";

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

/**
 * A branch `linked` on top of `parent` whose tree holds `link` as a symbolic link in place of
 * whatever was there. Only a scratch index changes, so the working tree and the current index stay
 * as they are on every platform.
 */
function commitWithLink(parent: string, link: string): void {
  const env = { ...process.env, GIT_INDEX_FILE: path.join(root, ".git", "qfai-link-index") };
  const gitIn = (args: string[], input?: string): string =>
    execFileSync("git", args, { cwd: root, env, encoding: "utf8", input }).trim();
  gitIn(["read-tree", parent]);
  gitIn(["rm", "-r", "-q", "-f", "--cached", "--ignore-unmatch", "--", link]);
  const blob = gitIn(["hash-object", "-w", "--stdin"], "elsewhere");
  gitIn(["update-index", "--add", "--cacheinfo", `120000,${blob},${link}`]);
  const tree = gitIn(["write-tree"]);
  const commit = gitIn(["commit-tree", tree, "-p", parent, "-m", "linked"]);
  gitIn(["update-ref", "refs/heads/linked", commit]);
}

async function put(file: string, content: string): Promise<void> {
  if (file === decisions && content.startsWith("|"))
    content = "# Decisions\n\n## Decisions\n\n" + content;
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function config() {
  const value = structuredClone(defaultConfig);
  value.paths.specsDir = specs;
  value.paths.contractsDir = `${specs}/03_contract`;
  value.baseBranch = "main";
  return value;
}

beforeEach(async () => {
  baseRead.unreadable = false;
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-drift-"));
  git("init", "-b", "main");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
});

describe("next free ID public CLI", () => {
  function gitText(...args: string[]): string {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  }

  async function invoke(argv: string[]) {
    const previous = process.exitCode;
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    process.exitCode = undefined;
    try {
      await run(["sdd", "next-id", ...argv, "--root", root], root);
      return {
        code: process.exitCode,
        stdout: stdout.mock.calls.map((call) => String(call[0])).join(""),
        stderr: stderr.mock.calls.map((call) => String(call[0])).join(""),
      };
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      process.exitCode = previous;
    }
  }

  // QFAI:EX-0001-0008-29
  it("prints the number after the highest ID of the base and the working tree, not after the last row", async () => {
    git("config", "core.autocrlf", "false");
    await put(decisions, table + "| DEC-0001 | Retired BF-0001 | Keep |\n");
    git("add", ".");
    git("commit", "-m", "ancestor");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      table +
        "| DEC-0001 | Retired BF-0001 | Keep |\n| DEC-20261105093000 | Retired BF-0002 | Keep |\n",
    );
    git("add", ".");
    git("commit", "-m", "topic decision");
    git("checkout", "main");
    await put(
      decisions,
      table +
        "| DEC-0001 | Retired BF-0001 | Keep |\n" +
        "| DEC-20261104120000 | Retired BF-0006 | Keep |\n" +
        "| DEC-0003 | Retired BF-0003, placed after a higher ID | Keep |\n",
    );
    git("add", ".");
    git("commit", "-m", "base advances");
    git("checkout", "topic");

    const fromBase = await invoke(["BF", "--base", "main"]);
    expect(fromBase.code).toBe(0);
    expect(fromBase.stdout.trim()).toBe("BF-0007");

    await put(
      decisions,
      table +
        "| DEC-0001 | Retired BF-0001 | Keep |\n" +
        "| DEC-20261105093000 | Retired BF-0002 | Keep |\n" +
        "| DEC-20261105100000 | Retired BF-0009 | Keep |\n",
    );
    const before = await readFile(path.join(root, decisions));
    const status = gitText("status", "--porcelain", "--untracked-files=all");
    const fromWorkingTree = await invoke(["BF", "--base", "main"]);
    expect(fromWorkingTree.code).toBe(0);
    expect(fromWorkingTree.stdout.trim()).toBe("BF-0010");
    expect((await readFile(path.join(root, decisions))).equals(before)).toBe(true);
    expect(gitText("status", "--porcelain", "--untracked-files=all")).toBe(status);
  });

  const flow = `${specs}/02_business-flow/business-flow-0001`;
  const storyFile = (tail: string) => `${flow}/user-story-0001-${tail}/01_User-story.md`;
  const contract = (rules: string[]) =>
    "# CLI-0003: Check\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n" +
    rules.map((id) => `| ${id} | A rule. | - |\n`).join("");

  async function branchFromMain(): Promise<void> {
    git("config", "core.autocrlf", "false");
    await put(decisions, table + "| DEC-0001 | Ancestor | Keep |\n");
    await put(`${flow}/business-flow.md`, "# BF-0001: Flow\n");
    await put(storyFile("0001"), "# US-0001-0001: Story\n");
    git("add", ".");
    git("commit", "-m", "ancestor");
    git("checkout", "-b", "topic");
  }

  // QFAI:EX-0001-0008-29
  it("reads a parented kind from the base, where the base alone holds the higher ID", async () => {
    await branchFromMain();
    git("checkout", "main");
    await put(storyFile("0004"), "# US-0001-0004: Base story\n");
    git("add", ".");
    git("commit", "-m", "base story");
    git("checkout", "topic");
    const result = await invoke(["US", "BF-0001", "--base", "main"]);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("US-0001-0005");
  });

  // QFAI:EX-0001-0008-29
  it("numbers an AC under a story that only the working tree declares", async () => {
    await branchFromMain();
    await put(storyFile("0002"), "# US-0001-0002: Uncommitted story\n");
    await put(
      `${flow}/user-story-0001-0002/02_Acceptance-Criteria.md`,
      "# Acceptance Criteria\n\n## Criteria\n\n```gherkin\nFeature: F\n  # AC-0001-0002-01\n  Scenario: S\n    Given a\n```\n",
    );
    const result = await invoke(["AC", "US-0001-0002", "--base", "main"]);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("AC-0001-0002-02");
  });

  // QFAI:EX-0001-0008-29
  it("reads a BR from a contracts directory outside the story tree", async () => {
    await put("qfai.config.yaml", `paths:\n  specsDir: ${specs}\n  contractsDir: contracts\n`);
    await put("contracts/cli/cli-0003-check.md", contract(["BR-0003-0001"]));
    await branchFromMain();
    git("checkout", "main");
    await put("contracts/cli/cli-0003-check.md", contract(["BR-0003-0001", "BR-0003-0002"]));
    git("add", ".");
    git("commit", "-m", "base rule");
    git("checkout", "topic");
    const result = await invoke(["BR", "CLI-0003", "--base", "main"]);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("BR-0003-0003");
  });

  // QFAI:EX-0001-0008-30
  it.each([
    ["an intermediate story-tree component", ".qfai", false],
    ["a contracts directory outside the story tree", "contracts", true],
  ])("refuses a base where %s is a symbolic link", async (_label, link, outside) => {
    if (outside)
      await put("qfai.config.yaml", `paths:\n  specsDir: ${specs}\n  contractsDir: contracts\n`);
    await branchFromMain();
    commitWithLink("main", link);
    const result = await invoke(["BF", "--base", "linked"]);
    expect(result.code).toBe(2);
    expect(result.stdout).not.toMatch(/\bBF-\d{4}/);
    expect(result.stderr).toContain(`Unsafe fixed story-tree directory: ${link}`);
  });

  // QFAI:EX-0001-0008-29
  it("reads a base whose story tree is the repository root", async () => {
    await put("decisions.md", table + "| DEC-0001 | Root | Keep |\n");
    await put("03_contract/cli/cli-0003-check.md", contract(["BR-0003-0001"]));
    git("add", ".");
    git("commit", "-m", "root story tree");
    const { model } = await readStoryTreeAtRef({
      root,
      ref: "main",
      specsDir: ".",
      contractsDir: "03_contract",
    });
    expect(nextStoryTreeId(model, "BF")).toBe("BF-0001");
    expect(nextStoryTreeId(model, "BR", "CLI-0003")).toBe("BR-0003-0002");
  });

  // QFAI:EX-0001-0008-30
  it.each([
    ["duplicated", table + "| DEC-0002 | Base | Keep |\n| DEC-0002 | Again | Keep |\n"],
    [
      "incomplete",
      "# Decisions\n\n## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions\n\n| ID | Content | Approach |\n| --- | --- | --- |\n",
    ],
  ])("refuses a %s base decision register", async (_label, register) => {
    await branchFromMain();
    git("checkout", "main");
    await writeFile(path.join(root, decisions), register, "utf8");
    git("add", ".");
    git("commit", "-m", "base register");
    git("checkout", "topic");
    const result = await invoke(["BF", "--base", "main"]);
    expect(result.code).toBe(2);
    expect(result.stdout).not.toMatch(/\bBF-\d{4}/);
    expect(result.stderr).toContain("refused");
  });

  // QFAI:EX-0001-0008-30
  it.each([
    [["US", "--base", "main"], "BF parent"],
    [["BF", "--base", "no-such-ref"], "no-such-ref"],
    [["DEC", "--base", "main"], "DEC"],
    [["OQ", "--base", "main"], "OQ"],
    [["US", "BF-0009", "--base", "main"], "BF-0009"],
  ])("reports %j and exits 2 without printing an ID", async (argv, reason) => {
    await put(decisions, table + "| DEC-0001 | Ancestor | Keep |\n");
    git("add", ".");
    git("commit", "-m", "ancestor");
    const result = await invoke(argv);
    expect(result.code).toBe(2);
    // A refused kind may print the usage text, but never an ID on a line of its own.
    expect(result.stdout).not.toMatch(/^(?:US|BF|DEC|OQ)-[\d-]+\s*$/m);
    expect(result.stderr).toContain(reason);
  });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("story-tree drift", () => {
  const questions = `${specs}/open-questions.md`;
  const questionTable = "| ID | Content | Approach |\n| --- | --- | --- |\n";

  /** Commits `base` on main, then `head` on a topic branch; each maps a file to its content. */
  async function branch(base: Record<string, string>, head: Record<string, string>): Promise<void> {
    for (const [file, content] of Object.entries(base)) await put(file, content);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const [file, content] of Object.entries(head)) await put(file, content);
    git("add", "-A", ".");
    git("commit", "-m", "head");
  }

  async function findings(profile: "tdd" | "drift") {
    return (await validateStoryTreeDrift(root, config(), profile)).filter(
      ({ code }) => code !== "QFAI-DRIFT-003",
    );
  }

  const rewritten = (items: readonly { code: string; message: string }[]) =>
    items.filter(({ code }) => code === "QFAI-STORY-010").map(({ message }) => message);
  const errors = (items: readonly { code: string; severity: string }[]) =>
    items.filter(({ severity }) => severity === "error").map(({ code }) => code);

  // QFAI:AC-0001-0007-02
  // QFAI:AC-0001-0054-01
  // QFAI:EX-0001-0007-07
  // QFAI:EX-0001-0054-02
  it("reports a rewritten row in drift", async () => {
    await branch(
      {
        [decisions]: `${table}| DEC-0001 | Choice A | Reason |\n| DEC-0002 | Choice X | Reason |\n`,
        [questions]: `${questionTable}| OQ-0001 | Which layout | Pending |\n`,
      },
      {
        [decisions]: `${table}| DEC-0001 | Choice B | Reason |\n| DEC-20261105093000 | Choice X | Reason |\n`,
        [questions]: `${questionTable}| OQ-0001 | Which layout | Deferred to the next release |\n`,
      },
    );
    const messages = rewritten(await findings("drift"));
    expect(messages).toEqual([
      expect.stringContaining(`${decisions}: DEC-0001 content changed`),
      expect.stringContaining(`${decisions}: DEC-0002 row removed or its ID changed`),
      `${questions}: OQ-0001 approach changed`,
    ]);
  });

  // QFAI:AC-0001-0007-02
  // QFAI:EX-0001-0007-06
  it("accepts a row appended at the end", async () => {
    await branch(
      { [decisions]: `${table}| DEC-0001 | Choice A | Reason |\n` },
      {
        [decisions]: `${table}| DEC-0001 | Choice A | Reason |\n| DEC-20261105093000 | New choice | Reason |\n`,
      },
    );
    expect(await findings("drift")).toEqual([]);
  });

  // QFAI:EX-0001-0007-11
  // QFAI:EX-0001-0054-18
  it("matches base rows by ID when a union merge interleaves a new row", async () => {
    const first = "| DEC-0001 | First | Reason |\n";
    const second = "| DEC-0002 | Second | Reason |\n";
    await branch(
      { [decisions]: table + first + second },
      {
        [decisions]: `${table}${second}| DEC-20261105093000 | Between | Reason |\n${first}`,
        [glossary]: "# New\n",
      },
    );
    const items = await findings("drift");
    expect(rewritten(items)).toEqual([]);
  });

  // QFAI:AC-0001-0007-02
  // QFAI:AC-0001-0054-01
  // QFAI:EX-0001-0007-08
  // QFAI:EX-0001-0054-01
  it("reports removal of an existing decision row", async () => {
    await branch(
      { [decisions]: `${table}| DEC-0001 | Choice A | Reason |\n` },
      { [decisions]: table },
    );
    expect(rewritten(await findings("drift"))).toEqual([
      expect.stringContaining(`${decisions}: DEC-0001 row removed`),
    ]);
  });

  // QFAI:AC-0001-0007-06
  // QFAI:EX-0001-0007-31
  it("accepts a deleted question that the appended decision names", async () => {
    await branch(
      {
        [decisions]: table,
        [questions]: `${questionTable}| OQ-0031 | Which layout | Pending |\n`,
      },
      {
        [decisions]: `${table}| DEC-20261105093000 | Grid layout | Settles OQ-0031 |\n`,
        [questions]: questionTable,
      },
    );
    expect(await findings("drift")).toEqual([]);
  });

  // QFAI:EX-0001-0007-32
  it("reports a deleted question that no row of the head names", async () => {
    await branch(
      {
        [decisions]: table,
        [questions]: `${questionTable}| OQ-0031 | Which layout | Pending |\n`,
      },
      { [questions]: questionTable },
    );
    const items = await findings("drift");
    expect(rewritten(items)).toEqual([
      `${questions}: OQ-0031 removed, and no decision row or question row of the head names it`,
    ]);
    expect(items.find(({ code }) => code === "QFAI-STORY-010")?.file).toBe(questions);
  });

  // QFAI:EX-0001-0007-33
  it("reports a question row whose Approach the head rewrites", async () => {
    await branch(
      {
        [decisions]: table,
        [questions]: `${questionTable}| OQ-0031 | Which layout | Pending |\n`,
      },
      {
        [questions]: `${questionTable}| OQ-0031 | Which layout | Deferred to the next release |\n`,
      },
    );
    expect(rewritten(await findings("drift"))).toEqual([`${questions}: OQ-0031 approach changed`]);
  });

  // QFAI:AC-0001-0007-07
  // QFAI:EX-0001-0007-34
  // QFAI:AC-0001-0054-12
  // QFAI:EX-0001-0054-25
  it("reports each row the branch adds with a four-digit ID", async () => {
    await branch(
      {
        [decisions]: `${table}| DEC-0145 | Choice | Reason |\n`,
        [questions]: questionTable,
      },
      {
        [decisions]: `${table}| DEC-0145 | Choice | Reason |\n| DEC-0146 | Legacy | Reason |\n| DEC-20261105093000 | Timestamp | Reason |\n`,
        [questions]: `${questionTable}| OQ-0032 | Legacy question | Pending |\n`,
      },
    );
    const items = (await findings("drift")).filter(({ code }) => code === "QFAI-STORY-010");
    expect(items.map(({ file, refs }) => [file, refs])).toEqual([
      [decisions, ["DEC-0146"]],
      [questions, ["OQ-0032"]],
    ]);
  });

  // QFAI:EX-0001-0054-29
  it("reads a base register that still holds a Status column without that column", async () => {
    await branch(
      {
        [decisions]: `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0145 | Choice | Reason | DONE |\n`,
        [questions]: `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| OQ-0007 | Which layout | Pending | TODO |\n`,
      },
      {
        [decisions]: `${table}| DEC-0145 | Choice | Reason |\n`,
        [questions]: `${questionTable}| OQ-0007 | Which layout | Pending |\n`,
      },
    );
    const items = await findings("drift");
    expect(items.filter(({ code }) => code.startsWith("QFAI-DRIFT-"))).toEqual([]);
    expect(rewritten(items)).toEqual([]);
  });

  // QFAI:EX-0001-0007-35
  // QFAI:EX-0001-0054-27
  it("accepts a deferred question deleted and replaced by a question row naming it", async () => {
    await branch(
      {
        [decisions]: table,
        [questions]: `${questionTable}| OQ-0007 | Which layout | Pending |\n`,
      },
      {
        [questions]: `${questionTable}| OQ-20261105093000 | Which layout | Replaces OQ-0007; next decision at the next release |\n`,
      },
    );
    const items = await findings("drift");
    expect(rewritten(items)).toEqual([]);
    expect(errors(items)).toEqual([]);
  });

  // QFAI:EX-0001-0054-26
  it("reports only the deleted question that nothing names", async () => {
    await branch(
      {
        [decisions]: table,
        [questions]: `${questionTable}| OQ-0007 | First | Pending |\n| OQ-20261101080000 | Second | Pending |\n`,
      },
      {
        [decisions]: `${table}| DEC-20261105093000 | Answer to OQ-0007 | Asked |\n`,
        [questions]: questionTable,
      },
    );
    const items = (await findings("drift")).filter(({ code }) => code === "QFAI-STORY-010");
    expect(items.map(({ file, refs }) => [file, refs])).toEqual([
      [questions, ["OQ-20261101080000"]],
    ]);
  });

  // QFAI:EX-0001-0054-28
  it("reports a settled question that a merge brings back", async () => {
    await branch(
      {
        [decisions]: `${table}| DEC-20261101090000 | Grid layout, settling OQ-20261101080000 | Asked |\n`,
        [questions]: questionTable,
      },
      { [questions]: `${questionTable}| OQ-20261101080000 | Which layout | Pending |\n` },
    );
    const items = (await findings("drift")).filter(({ code }) => code === "QFAI-STORY-010");
    expect(items.map(({ file, refs, message }) => [file, refs, message])).toEqual([
      [
        questions,
        ["OQ-20261101080000"],
        `${questions}: OQ-20261101080000 is back, though a decision row the base holds names it`,
      ],
    ]);
  });

  // QFAI:EX-0001-0007-37
  it("reads a re-padded table as unchanged rows", async () => {
    await branch(
      { [decisions]: `${table}| DEC-0001 | Choice | Reason |\n` },
      {
        [decisions]:
          "# Decisions\n\n## Decisions\n\n" +
          "| ID                 | Content    | Approach |\n" +
          "| ------------------ | ---------- | -------- |\n" +
          "| DEC-0001           | Choice     | Reason   |\n" +
          "| DEC-20261105093000 | New choice | Reason   |\n",
      },
    );
    const items = await findings("drift");
    expect(rewritten(items)).toEqual([]);
    expect(errors(items)).toEqual([]);
  });

  // QFAI:EX-0001-0007-30
  it("reads listed pages then the root, and accepts a row appended to the root", async () => {
    const page = `${specs}/decisions/page-0002.md`;
    const pageText = `${table}| DEC-0001 | Paged | Reason |\n`;
    const listed = (rows: string) =>
      table.replace(
        "## Decisions",
        "## Decision pages\n\n- decisions/page-0002.md\n\n## Decisions",
      ) + rows;
    await branch(
      { [decisions]: listed(""), [page]: pageText },
      { [decisions]: listed("| DEC-20261105093000 | Appended | Reason |\n") },
    );
    const items = await findings("drift");
    expect(rewritten(items)).toEqual([]);
    expect(errors(items)).toEqual([]);
  });

  // QFAI:EX-0001-0054-19
  it("reports an edited decision page row, and nothing for a row appended to a page", async () => {
    const page = `${specs}/decisions/page-0001.md`;
    const listedRoot = table.replace(
      "## Decisions",
      "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
    );
    const pageText = `${table}| DEC-0001 | Paged | Reason |\n`;
    await branch(
      { [decisions]: listedRoot, [page]: pageText },
      {
        [page]: `${table}| DEC-0001 | Paged again | Reason |\n| DEC-20261105093000 | Appended | Reason |\n`,
      },
    );
    const items = await findings("drift");
    expect(errors(items)).toEqual(["QFAI-STORY-010"]);
    expect(rewritten(items)).toEqual([
      expect.stringContaining(`${page}: DEC-0001 content changed`),
    ]);
  });

  // QFAI:EX-0001-0054-30
  it("reads a decision page base that still holds a Status column without that column", async () => {
    const page = `${specs}/decisions/page-0001.md`;
    const listedRoot = table.replace(
      "## Decisions",
      "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
    );
    const legacyPage = table
      .replace("| ID | Content | Approach |", "| ID | Content | Approach | Status |")
      .replace("| --- | --- | --- |", "| --- | --- | --- | --- |");
    await branch(
      { [decisions]: listedRoot, [page]: `${legacyPage}| DEC-0001 | Paged | Reason | DONE |\n` },
      { [page]: `${table}| DEC-0001 | Paged | Reason |\n` },
    );
    const items = await findings("drift");
    expect(errors(items)).toEqual([]);
    expect(rewritten(items)).toEqual([]);
  });

  it("still reports a page whose Status column is dropped together with an edited cell", async () => {
    const page = `${specs}/decisions/page-0001.md`;
    const listedRoot = table.replace(
      "## Decisions",
      "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
    );
    const legacyPage = table
      .replace("| ID | Content | Approach |", "| ID | Content | Approach | Status |")
      .replace("| --- | --- | --- |", "| --- | --- | --- | --- |");
    await branch(
      { [decisions]: listedRoot, [page]: `${legacyPage}| DEC-0001 | Paged | Reason | DONE |\n` },
      { [page]: `${table}| DEC-0001 | Paged again | Reason |\n` },
    );
    expect(rewritten(await findings("drift"))).toEqual([
      expect.stringContaining(`${page}: DEC-0001 content changed`),
    ]);
  });

  it("does not accuse the migration branch when the base has no story tree", async () => {
    await put("README.md", "base\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "migration");
    expect(await validateStoryTreeDrift(root, config(), "drift")).toEqual([]);
  });

  // QFAI:AC-0001-0054-05
  // QFAI:EX-0001-0054-09
  it("holds the tree to the base once a commit with a story tree is the base", async () => {
    const contractFile = `${specs}/03_contract/cli/command.md`;
    await put("README.md", "base\n");
    git("add", ".");
    git("commit", "-m", "base without a story tree");
    git("checkout", "-b", "topic");
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason |\n`);
    await put(glossary, "# Terms\n");
    await put(contractFile, "# Command\n");
    git("add", ".");
    git("commit", "-m", "add the story tree");
    for (const profile of ["tdd", "drift"] as const) {
      const findings = await validateStoryTreeDrift(root, config(), profile);
      expect(findings.filter(({ severity }) => severity !== "info")).toEqual([]);
    }

    git("checkout", "main");
    git("merge", "--ff-only", "topic");
    git("checkout", "-b", "next");
    await put(decisions, `${table}| DEC-0001 | Choice B | Reason |\n`);
    git("add", ".");
    git("commit", "-m", "rewrite the decision row");
    const nonInfo = async (profile: "tdd" | "drift") =>
      (await validateStoryTreeDrift(root, config(), profile))
        .filter(({ severity }) => severity !== "info")
        .map((item) => `${item.code} ${item.file}`);
    expect(await nonInfo("tdd")).toEqual([]);
    expect(await nonInfo("drift")).toEqual([`QFAI-STORY-010 ${decisions}`]);
  });

  it("reports no drift finding when the base ref is missing, and nothing outside a repository", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    const missing = config();
    missing.baseBranch = "missing/base";
    expect((await validateStoryTreeDrift(root, missing, "drift")).map(({ code }) => code)).toEqual([
      "QFAI-DRIFT-003",
    ]);
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-story-no-git-"));
    try {
      expect(await validateStoryTreeDrift(outside, config(), "drift")).toEqual([]);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  // QFAI:AC-0001-0054-02
  // QFAI:EX-0001-0054-03
  it("reports nothing in drift for a removed row when the base cannot be resolved", async () => {
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, table);
    git("add", ".");
    git("commit", "-m", "remove a row");

    expect(
      (await validateStoryTreeDrift(root, config(), "drift")).filter(
        (item) => item.file === decisions,
      ).length,
    ).toBeGreaterThan(0);

    const missing = config();
    missing.baseBranch = "missing/base";
    const findings = await validateStoryTreeDrift(root, missing, "drift");
    expect(findings.map(({ code }) => code)).toEqual(["QFAI-DRIFT-003"]);
  });

  // QFAI:AC-0001-0054-10
  // QFAI:EX-0001-0054-21
  describe("the base the drift checks compare with", () => {
    async function branchedFromBase(): Promise<string> {
      await put(decisions, table);
      await put(glossary, "# Terms\n");
      git("add", ".");
      git("commit", "-m", "base");
      const base = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim();
      git("checkout", "-b", "topic");
      return base;
    }

    it.each(["tdd", "drift"] as const)(
      "warns in %s, naming the base, when it has no merge base with HEAD",
      async (profile) => {
        await branchedFromBase();
        const missing = config();
        missing.baseBranch = "missing/base";
        const findings = await validateStoryTreeDrift(root, missing, profile);
        expect(findings).toEqual([
          expect.objectContaining({
            code: "QFAI-DRIFT-003",
            severity: "warning",
            message: expect.stringContaining('"missing/base"'),
            suggested_action: expect.stringContaining("baseBranch"),
          }),
        ]);
      },
    );

    it("names the merge base and the changed file count in the drift profile", async () => {
      const base = await branchedFromBase();
      await put(glossary, "# Terms\nUpdated\n");
      git("add", ".");
      git("commit", "-m", "edit the glossary");
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings).toContainEqual(
        expect.objectContaining({
          code: "QFAI-DRIFT-003",
          severity: "info",
          message: `Compared 1 changed file with "main" at merge base ${base.slice(0, 12)}.`,
        }),
      );
    });

    it("says the branch has no commit of its own when HEAD is the merge base", async () => {
      const base = await branchedFromBase();
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings).toEqual([
        expect.objectContaining({
          code: "QFAI-DRIFT-003",
          severity: "info",
          message: `Compared 0 changed files with "main" at merge base ${base.slice(0, 12)}; HEAD is that commit, so the branch has no commit of its own.`,
        }),
      ]);
    });

    it("still compares in drift when the base decision ledger is over one mebibyte", async () => {
      const large = "x".repeat(1_100_000);
      await put(decisions, `${table}| DEC-0001 | ${large} | Reason |\n`);
      git("add", ".");
      git("commit", "-m", "base with a large ledger");
      git("checkout", "-b", "topic");
      await put(decisions, `${table}| DEC-0001 | ${large} | Another reason |\n`);
      git("add", ".");
      git("commit", "-m", "rewrite the large row");
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings).toContainEqual(
        expect.objectContaining({ code: "QFAI-STORY-010", refs: ["DEC-0001"] }),
      );
    });

    it.each(["tdd", "drift"] as const)(
      "warns in %s when the base holds decisions.md and it cannot be read",
      async (profile) => {
        await branchedFromBase();
        await put(glossary, "# Terms\nUpdated\n");
        git("add", ".");
        git("commit", "-m", "edit the glossary");
        baseRead.unreadable = true;
        const findings = await validateStoryTreeDrift(root, config(), profile);
        expect(findings).toEqual([
          expect.objectContaining({
            code: "QFAI-DRIFT-003",
            severity: "warning",
            message: `Nothing was compared: ${decisions} at "main" could not be read.`,
          }),
        ]);
      },
    );

    it("stays silent when the base holds no decisions.md at all", async () => {
      await put("README.md", "base\n");
      git("add", ".");
      git("commit", "-m", "base without a story tree");
      git("checkout", "-b", "topic");
      await put(decisions, table);
      git("add", ".");
      git("commit", "-m", "add the story tree");
      baseRead.unreadable = true;
      expect(await validateStoryTreeDrift(root, config(), "drift")).toEqual([]);
    });

    it("names no base in the tdd profile once the comparison ran", async () => {
      await branchedFromBase();
      expect(await validateStoryTreeDrift(root, config(), "tdd")).toEqual([]);
    });
  });

  // QFAI:EX-0001-0053-04
  it("reads old change-request rows as ordinary decision rows", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Terms\nUpdated\n");
    await put(
      decisions,
      `${table}| DEC-20261105093000 | Change request: ${glossary} | Approved |\n| DEC-20261105093001 | Declined change request: ${glossary} | Declined |\n| DEC-20261105093002 | Declined: ${glossary} | Rejected option |\n`,
    );
    git("add", ".");
    git("commit", "-m", "old rows");
    for (const profile of ["tdd", "drift"] as const) {
      const findings = await validateStoryTreeDrift(root, config(), profile);
      expect(findings.filter(({ severity }) => severity !== "info")).toEqual([]);
    }
  });
});

// Supplementary missing-root regression: existing page history prevents an absent-base exemption.
it("rejects a resolvable root-configured base with orphan page history before any comparison", async () => {
  const rootDecision = "decisions.md";
  const page = "decisions/page-0001.md";
  const request = "| DEC-0002 | Valid head root | Keep |\n";
  await put(page, table + "| DEC-0001 | Historical choice | Keep |\n");
  git("add", ".");
  git("commit", "-m", "resolvable base has page history but no root");
  git("checkout", "-b", "topic");
  await put(
    rootDecision,
    table.replace("## Decisions", "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions") +
      request,
  );
  git("add", ".");
  git("commit", "-m", "a valid head root cannot waive an unreadable base layout");
  const rootConfig = config();
  rootConfig.paths.specsDir = ".";
  rootConfig.paths.contractsDir = "03_contract";
  const findings = await validateStoryTreeDrift(root, rootConfig, "drift");
  expect(findings).toHaveLength(1);
  expect(findings).toContainEqual(
    expect.objectContaining({
      code: "QFAI-DRIFT-001",
      severity: "error",
      file: rootDecision,
      message: expect.stringContaining("Missing decisions root"),
    }),
  );
});
