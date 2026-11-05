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

const baseRead = vi.hoisted(() => ({ unreadable: false, statusFails: false }));

// A base file git cannot show (past the output ceiling) cannot be built cheaply, so the read
// of the base is made to fail for the one test that needs it.
vi.mock("../../src/core/gitChanges.js", async (importOriginal) => {
  const original = await importOriginal<typeof GitChanges>();
  return {
    ...original,
    readFileAtBase: (...args: Parameters<typeof original.readFileAtBase>) =>
      baseRead.unreadable ? null : original.readFileAtBase(...args),
    uncommittedContentPaths: (...args: Parameters<typeof original.uncommittedContentPaths>) =>
      baseRead.statusFails ? null : original.uncommittedContentPaths(...args),
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
  baseRead.statusFails = false;
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
  const flows = `${specs}/02_business-flow/business-flows.md`;

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
  const upstream = (items: readonly { code: string; file?: string }[]) =>
    items.filter(({ code }) => code === "QFAI-DRIFT-001").map(({ file }) => file);

  // QFAI:AC-0001-0054-03
  // QFAI:EX-0001-0002-04
  // QFAI:EX-0001-0054-04
  it("reports each protected story-tree edit and excludes evidence", async () => {
    const protectedFiles = [
      `${specs}/02_business-flow/business-flow-0001/business-flow.md`,
      glossary,
      `${specs}/03_contract/cli/command.md`,
      questions,
    ];
    await put(decisions, table);
    for (const file of protectedFiles) await put(file, "# Original\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const file of protectedFiles) await put(file, "# Changed\n");
    await put(".qfai/evidence/notes.md", "new evidence\n");
    await put("tmp/notes.md", "scratch\n");
    git("add", ".");
    git("commit", "-m", "edit protected files and evidence");
    const reported = upstream(await findings("tdd"));
    for (const file of protectedFiles) expect(reported, file).toContain(file);
    expect(reported).not.toContain(".qfai/evidence/notes.md");
    expect(reported).not.toContain("tmp/notes.md");
  });

  // QFAI:EX-0001-0054-05
  it.each(["tdd", "drift"] as const)(
    "authorises only the change request the branch adds, in %s",
    async (profile) => {
      await branch(
        {
          [decisions]: `${table}| DEC-0001 | Change request: ${flows} | Approved |\n`,
          [glossary]: "# Original\n",
          [flows]: "# Original\n",
        },
        {
          [decisions]: `${table}| DEC-0001 | Change request: ${flows} | Approved |\n| DEC-20261105093000 | Change request: ${glossary} | Approved |\n`,
          [glossary]: "# Changed\n",
          [flows]: "# Changed\n",
        },
      );
      const reported = upstream(await findings(profile));
      expect(reported).toContain(flows);
      expect(reported).not.toContain(glossary);
      expect(reported).not.toContain(decisions);
    },
  );

  // QFAI:EX-0001-0002-05
  it("accepts a change the change request this branch appends names", async () => {
    await branch(
      { [decisions]: table, [glossary]: "# Original\n" },
      {
        [decisions]: `${table}| DEC-20261105093000 | Change request: ${glossary} | Approved |\n`,
        [glossary]: "# Changed\n",
      },
    );
    expect(upstream(await findings("tdd"))).toEqual([]);
  });

  // QFAI:EX-0001-0002-14
  it("authorises nothing by a row the base holds or by an ID", async () => {
    const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md`;
    const baseRows = `| DEC-0001 | Change request: ${glossary} | Applied |\n| DEC-0002 | Change request: US-0001-0001 | Approved |\n`;
    await branch(
      {
        [decisions]: table + baseRows,
        [glossary]: "# Original\n",
        [flows]: "# Original\n",
        [story]: "# Original\n",
      },
      {
        [decisions]: `${table}${baseRows}| DEC-20261105093000 | Change request: ${flows} | Approved |\n`,
        [glossary]: "# Changed\n",
        [flows]: "# Changed\n",
        [story]: "# Changed\n",
      },
    );
    const reported = upstream(await findings("tdd"));
    expect(reported).toContain(glossary);
    expect(reported).toContain(story);
    expect(reported).not.toContain(flows);
  });

  // QFAI:EX-0001-0002-15
  it("needs a change request of its own for a path an inherited request named", async () => {
    const inherited = `| DEC-0001 | Change request: ${glossary} | Applied |\n`;
    await branch(
      { [decisions]: table + inherited, [glossary]: "# Original\n" },
      {
        [decisions]: `${table}${inherited}| DEC-20261105093000 | Change request: ${glossary} | Approved again |\n`,
        [glossary]: "# Changed\n",
      },
    );
    expect(upstream(await findings("tdd"))).not.toContain(glossary);
  });

  // QFAI:AC-0001-0054-04
  // QFAI:EX-0001-0054-06
  // QFAI:EX-0001-0054-07
  // QFAI:EX-0001-0002-06
  // QFAI:EX-0001-0054-08
  it("needs no change request to append rows or to delete a question a decision names", async () => {
    await branch(
      {
        [decisions]: `${table}| DEC-0001 | Choice | Reason |\n`,
        [questions]: `${questionTable}| OQ-0001 | Which layout | Pending |\n`,
      },
      {
        [decisions]: `${table}| DEC-0001 | Choice | Reason |\n| DEC-20261105093000 | Grid layout, settling OQ-0001 | Asked |\n`,
        [questions]: `${questionTable}| OQ-20261105093001 | Which colour | Pending |\n`,
      },
    );
    const items = await findings("drift");
    expect(upstream(items)).toEqual([]);
    expect(rewritten(items)).toEqual([]);
  });

  // QFAI:EX-0001-0054-08
  it("reports a rewritten decision row as an upstream edit and a rewritten row", async () => {
    await branch(
      { [decisions]: `${table}| DEC-0001 | Choice | Reason |\n` },
      { [decisions]: `${table}| DEC-0001 | Another choice | Reason |\n` },
    );
    const items = await findings("drift");
    expect(upstream(items)).toEqual([decisions]);
    expect(rewritten(items)).toEqual([expect.stringContaining("DEC-0001 content changed")]);
  });

  describe("a row the base holds", () => {
    const objective = `${specs}/01_policy/objective.md`;

    async function glossaryEditedUnder(baseRow: string, headRows: string): Promise<void> {
      await branch(
        { [decisions]: `${table}${baseRow}\n`, [glossary]: "# Original\n", [objective]: "# A\n" },
        { [decisions]: `${table}${headRows}\n`, [glossary]: "# Changed\n" },
      );
    }

    async function reportedGlossary(profile: "tdd" | "drift"): Promise<boolean> {
      return upstream(await findings(profile)).includes(glossary);
    }

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "grants nothing for a path its rewritten Content names, in %s",
      async (profile) => {
        await glossaryEditedUnder(
          `| DEC-0001 | Change request: ${objective} | Approved |`,
          `| DEC-0001 | Change request: ${glossary} | Approved |`,
        );
        expect(await reportedGlossary(profile)).toBe(true);
      },
    );

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "grants nothing when an ordinary decision is rewritten into a change request, in %s",
      async (profile) => {
        await glossaryEditedUnder(
          "| DEC-0001 | Choice A | Reason |",
          `| DEC-0001 | Change request: ${glossary} | Reason |`,
        );
        expect(await reportedGlossary(profile)).toBe(true);
      },
    );

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "grants nothing for a path its rewritten Approach names, in %s",
      async (profile) => {
        await glossaryEditedUnder(
          `| DEC-0001 | Change request: ${glossary} | Reason |`,
          `| DEC-0001 | Change request: ${glossary} | Another reason |`,
        );
        expect(await reportedGlossary(profile)).toBe(true);
      },
    );

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "authorises the path once a new change request is appended instead, in %s",
      async (profile) => {
        const row = `| DEC-0001 | Change request: ${objective} | Approved |`;
        await glossaryEditedUnder(
          row,
          `${row}\n| DEC-20261105093000 | Change request: ${glossary} | Approved |`,
        );
        expect(await reportedGlossary(profile)).toBe(false);
      },
    );
  });

  // QFAI:AC-0001-0007-02
  // QFAI:AC-0001-0054-01
  // QFAI:EX-0001-0007-07
  // QFAI:EX-0001-0054-02
  it("reports a rewritten row in drift even when a change request names the file", async () => {
    await branch(
      {
        [decisions]: `${table}| DEC-0001 | Choice A | Reason |\n| DEC-0002 | Choice X | Reason |\n`,
        [questions]: `${questionTable}| OQ-0001 | Which layout | Pending |\n`,
      },
      {
        [decisions]: `${table}| DEC-0001 | Choice B | Reason |\n| DEC-20261105093000 | Choice X | Reason |\n| DEC-20261105093001 | Change request: ${decisions}, ${questions} | Approved |\n`,
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
    expect(upstream(items)).toEqual([]);
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
    expect(upstream(items)).toEqual([]);
  });

  // QFAI:EX-0001-0054-17
  it("authorises nothing by a change request the base holds on a page", async () => {
    const page = `${specs}/decisions/page-0001.md`;
    const principle = `${specs}/01_policy/principle.md`;
    const listed = (rows: string) =>
      table.replace(
        "## Decisions",
        "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
      ) + rows;
    await branch(
      {
        [decisions]: listed(""),
        [page]: `${table}| DEC-0001 | Change request: ${glossary} | Applied |\n`,
        [glossary]: "# Original\n",
        [principle]: "# Original\n",
      },
      {
        [decisions]: listed(`| DEC-20261105093000 | Change request: ${principle} | Approved |\n`),
        [glossary]: "# Changed\n",
        [principle]: "# Changed\n",
      },
    );
    const items = await findings("drift");
    expect(upstream(items)).toEqual([glossary]);
    expect(rewritten(items)).toEqual([]);
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
    expect(upstream(items)).toEqual([]);
  });

  // QFAI:EX-0001-0054-19
  it("reports a row appended to a decision page as an upstream edit only", async () => {
    const page = `${specs}/decisions/page-0001.md`;
    const listedRoot = table.replace(
      "## Decisions",
      "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
    );
    const pageText = `${table}| DEC-0001 | Paged | Reason |\n`;
    await branch(
      { [decisions]: listedRoot, [page]: pageText },
      { [page]: `${pageText}| DEC-20261105093000 | Appended | Reason |\n` },
    );
    const items = await findings("drift");
    expect(upstream(items)).toEqual([page]);
    expect(rewritten(items)).toEqual([]);
  });

  describe("an edit that is not committed", () => {
    const contractFile = `${specs}/03_contract/cli/command.md`;
    const uncommitted = (findings: readonly { code: string }[]) =>
      findings.filter((item) => item.code === "QFAI-DRIFT-004");

    async function baseWithProtectedFiles(): Promise<void> {
      await put(decisions, table);
      await put(glossary, "# Terms\n");
      await put(contractFile, "# Command\n");
      git("add", ".");
      git("commit", "-m", "base");
      git("checkout", "-b", "topic");
    }

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it.each(["tdd", "drift"] as const)(
      "is named in %s as not compared, and the committed edit is then reported",
      async (profile) => {
        await baseWithProtectedFiles();
        await put(glossary, "# Terms\nUpdated\n");
        await put(contractFile, "# Command\nUpdated\n");
        const before = await validateStoryTreeDrift(root, config(), profile);
        expect(before.some((item) => item.code === "QFAI-DRIFT-001")).toBe(false);
        expect(uncommitted(before)).toEqual([
          expect.objectContaining({
            severity: "warning",
            message: `2 uncommitted changes to protected story-tree files are not compared with the base: ${glossary}, ${contractFile}.`,
            refs: [glossary, contractFile],
          }),
        ]);

        git("add", ".");
        git("commit", "-m", "edit the protected files");
        const after = await validateStoryTreeDrift(root, config(), profile);
        expect(after.filter((item) => item.code === "QFAI-DRIFT-001").map((i) => i.file)).toEqual([
          glossary,
          contractFile,
        ]);
        expect(uncommitted(after)).toEqual([]);
      },
    );

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it("names a new untracked protected file, and no more than five paths", async () => {
      await baseWithProtectedFiles();
      for (let index = 0; index < 7; index += 1) {
        await put(`${specs}/03_contract/cli/new-${index}.md`, "# New\n");
      }
      const findings = uncommitted(await validateStoryTreeDrift(root, config(), "drift"));
      expect(findings).toEqual([
        expect.objectContaining({
          message: expect.stringMatching(
            /^7 uncommitted changes to protected story-tree files are not compared with the base: .*new-4\.md and 2 more\.$/,
          ),
        }),
      ]);
      expect(findings[0]).toHaveProperty("refs.length", 5);
    });

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it("names a deleted file, a staged-only edit and both ends of a rename", async () => {
      await baseWithProtectedFiles();
      await rm(path.join(root, contractFile));
      expect(uncommitted(await validateStoryTreeDrift(root, config(), "drift"))).toEqual([
        expect.objectContaining({ refs: [contractFile] }),
      ]);

      git("checkout", "--", contractFile);
      await put(glossary, "# Terms\nStaged\n");
      git("add", glossary);
      expect(uncommitted(await validateStoryTreeDrift(root, config(), "drift"))).toEqual([
        expect.objectContaining({ refs: [glossary] }),
      ]);

      git("reset", "--hard");
      const renamed = `${specs}/01_policy/renamed.md`;
      git("mv", glossary, renamed);
      expect(uncommitted(await validateStoryTreeDrift(root, config(), "drift"))).toEqual([
        expect.objectContaining({ refs: [glossary, renamed] }),
      ]);
    });

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it("passes the edits a commit would pass without a change request", async () => {
      const examples = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md`;
      const citing = `${specs}/03_contract/cli/cli-0001-sample.md`;
      const exampleTable = "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
      const rule = (examplesCell: string) => `| BR-0001-0001 | A rule | ${examplesCell} |\n`;
      await put(decisions, table);
      await put(examples, `${exampleTable}| EX-0001-0001-01 | AC-0001-0001-01 | in | out |\n`);
      await put(citing, `# Sample\n\n${rule("EX-0001-0001-01")}`);
      git("add", ".");
      git("commit", "-m", "base");
      git("checkout", "-b", "topic");

      await put(
        examples,
        `${exampleTable}| EX-0001-0001-01 | AC-0001-0001-01 | in | out |\n| EX-0001-0001-02 | AC-0001-0001-01 | in2 | out2 |\n`,
      );
      await put(citing, `# Sample\n\n${rule("EX-0001-0001-01, EX-0001-0001-02")}`);

      expect(uncommitted(await validateStoryTreeDrift(root, config(), "drift"))).toEqual([]);
    });

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it("reports a file edited again after it was committed as the committed edit, once", async () => {
      await baseWithProtectedFiles();
      await put(glossary, "# Terms\nFirst\n");
      git("add", ".");
      git("commit", "-m", "first edit");
      await put(glossary, "# Terms\nFirst\nSecond\n");
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings.filter((item) => item.code === "QFAI-DRIFT-001").map((i) => i.file)).toEqual([
        glossary,
      ]);
      expect(uncommitted(findings)).toEqual([]);
    });

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it("says nothing was compared when git cannot list the working tree", async () => {
      await baseWithProtectedFiles();
      baseRead.statusFails = true;
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings).toContainEqual(
        expect.objectContaining({
          code: "QFAI-DRIFT-003",
          severity: "warning",
          message: "Nothing was compared: git could not list the uncommitted changes.",
        }),
      );
    });

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it("does not name a file whose only change is its line endings", async () => {
      await baseWithProtectedFiles();
      await put(glossary, "# Terms\r\n");
      expect(uncommitted(await validateStoryTreeDrift(root, config(), "drift"))).toEqual([]);
    });

    // QFAI:AC-0001-0054-11
    // QFAI:EX-0001-0054-22
    it("stays silent for a change request row, an authorised file and an unprotected file", async () => {
      await baseWithProtectedFiles();
      await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Reason |\n`);
      await put(glossary, "# Terms\nUpdated\n");
      await put("src/app.ts", "export const app = 1;\n");
      expect(uncommitted(await validateStoryTreeDrift(root, config(), "drift"))).toEqual([]);
    });
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
    await put(glossary, "# Terms\nUpdated\n");
    git("add", ".");
    git("commit", "-m", "edit the glossary");
    for (const profile of ["tdd", "drift"] as const) {
      const findings = await validateStoryTreeDrift(root, config(), profile);
      expect(
        findings
          .filter(({ severity }) => severity !== "info")
          .map((item) => `${item.code} ${item.file}`),
      ).toEqual([`QFAI-DRIFT-001 ${glossary}`]);
    }
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
  it.each(["tdd", "drift"] as const)(
    "reports nothing in %s for a removed row and an edited policy file when the base cannot be resolved",
    async (profile) => {
      await put(decisions, `${table}| DEC-0001 | Choice A | Reason |\n`);
      await put(glossary, "# Terms\n");
      git("add", ".");
      git("commit", "-m", "base");
      git("checkout", "-b", "topic");
      await put(decisions, table);
      await put(glossary, "# Terms\nUpdated\n");
      git("add", ".");
      git("commit", "-m", "remove a row and edit the glossary");

      expect(
        (await validateStoryTreeDrift(root, config(), profile)).filter(
          (item) => item.file === decisions || item.file === glossary,
        ).length,
      ).toBeGreaterThan(0);

      const missing = config();
      missing.baseBranch = "missing/base";
      const findings = await validateStoryTreeDrift(root, missing, profile);
      expect(findings.map(({ code }) => code)).toEqual(["QFAI-DRIFT-003"]);
    },
  );

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

    it.each(["tdd", "drift"] as const)(
      "still compares in %s when the base decision ledger is over one mebibyte",
      async (profile) => {
        await put(decisions, `${table}| DEC-0001 | ${"x".repeat(1_100_000)} | Reason |\n`);
        await put(glossary, "# Terms\n");
        git("add", ".");
        git("commit", "-m", "base with a large ledger");
        git("checkout", "-b", "topic");
        await put(glossary, "# Terms\nUpdated\n");
        git("add", ".");
        git("commit", "-m", "edit the glossary");
        const findings = await validateStoryTreeDrift(root, config(), profile);
        expect(findings).toContainEqual(
          expect.objectContaining({ code: "QFAI-DRIFT-001", file: glossary }),
        );
      },
    );

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

  // QFAI:EX-0001-0054-04
  // QFAI:EX-0001-0054-05
  // QFAI:EX-0001-0053-04
  it("does not let a declined change request authorise an edit and ignores unprotected tests", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Terms\nUpdated\n");
    await put("tests/unit/example.test.ts", "test\n");
    await put(
      decisions,
      `${table}| DEC-20261105093000 | Declined change request: ${glossary} | Declined by the owner |\n| DEC-20261105093001 | Declined: ${glossary} | Rejected option |\n`,
    );
    git("add", ".");
    git("commit", "-m", "edit without approval");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(findings.some((item) => item.file === glossary)).toBe(true);
    expect(findings.some((item) => item.file?.includes("example.test.ts"))).toBe(false);
    expect(findings.some((item) => item.file === decisions)).toBe(false);
  });

  // QFAI:EX-0001-0054-13
  it("exempts a 03_Example.md change that only appends EX rows", async () => {
    const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001`;
    const appended = `${story}/03_Example.md`;
    const rewritten = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0002/03_Example.md`;
    const head = "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
    const first = "| EX-0001-0001-01 | AC-0001-0001-01 | An empty name | 400 |\n";
    await put(decisions, table);
    await put(appended, `# Examples\n\n${head}${first}`);
    await put(rewritten, `# Examples\n\n${head}${first.replaceAll("0001-01", "0002-01")}`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    // The appended row is wider, so the formatter re-pads every row of the table.
    await put(
      appended,
      "# Examples\n\n" +
        "| EX-ID           | AC-Ref          | Input                | Expected |\n" +
        "| --------------- | --------------- | -------------------- | -------- |\n" +
        "| EX-0001-0001-01 | AC-0001-0001-01 | An empty name        | 400      |\n" +
        "| EX-0001-0001-02 | AC-0001-0001-01 | A name of 300 chars  | 400      |\n",
    );
    await put(
      rewritten,
      `# Examples\n\n${head}| EX-0001-0002-01 | AC-0001-0002-01 | An empty name | 422 |\n| EX-0001-0002-02 | AC-0001-0002-01 | A long name | 400 |\n`,
    );
    git("add", ".");
    git("commit", "-m", "append examples");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings.filter((item) => item.code === "QFAI-DRIFT-001").map((item) => item.file),
    ).toEqual([rewritten]);
  });

  // QFAI:EX-0001-0054-13
  it("still reports a non-EX row, a deleted EX row and a new 03_Example.md", async () => {
    const flow = `${specs}/02_business-flow/business-flow-0001`;
    const noted = `${flow}/user-story-0001-0001/03_Example.md`;
    const pruned = `${flow}/user-story-0001-0002/03_Example.md`;
    const created = `${flow}/user-story-0001-0003/03_Example.md`;
    const head = "# Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
    const row = (story: string, n: string) =>
      `| EX-0001-${story}-${n} | AC-0001-${story}-01 | Case ${n} | 400 |\n`;
    await put(decisions, table);
    await put(noted, `${head}${row("0001", "01")}`);
    await put(pruned, `${head}${row("0002", "01")}${row("0002", "02")}`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(noted, `${head}${row("0001", "01")}| Note | - | - | - |\n`);
    await put(pruned, `${head}${row("0002", "01")}`);
    await put(created, `${head}${row("0003", "01")}`);
    git("add", ".");
    git("commit", "-m", "edit examples");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings
        .filter((item) => item.code === "QFAI-DRIFT-001")
        .map((item) => item.file)
        .sort(),
    ).toEqual([noted, pruned, created].sort());
  });

  // QFAI:EX-0001-0054-14
  it("exempts a contract change that only adds EX IDs to Examples cells", async () => {
    const cited = `${specs}/03_contract/cli/cli-0001-a.md`;
    const reworded = `${specs}/03_contract/cli/cli-0002-b.md`;
    const rules = (id: string, examples: string, statement = "An empty name is refused.") =>
      `# CLI-${id}\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-${id}-0001 | ${statement} | ${examples} |\n`;
    await put(decisions, table);
    await put(cited, rules("0001", "EX-0001-0001-01"));
    await put(reworded, rules("0002", "EX-0001-0002-01"));
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(cited, rules("0001", "EX-0001-0001-01, EX-0001-0001-02"));
    await put(
      reworded,
      rules("0002", "EX-0001-0002-01, EX-0001-0002-02", "An empty or blank name is refused."),
    );
    git("add", ".");
    git("commit", "-m", "cite appended examples");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(findings.map((item) => item.file)).toEqual([reworded]);
  });

  // QFAI:EX-0001-0054-13
  // QFAI:EX-0001-0054-14
  it("still reports a whitespace edit inside a cell beside an appended example", async () => {
    const examples = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md`;
    const contract = `${specs}/03_contract/cli/cli-0001-a.md`;
    const head = "# Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
    const rule = (statement: string, cited: string) =>
      `# CLI-0001\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | ${statement} | ${cited} |\n`;
    await put(decisions, table);
    await put(examples, `${head}| EX-0001-0001-01 | AC-0001-0001-01 | An  empty name | 400 |\n`);
    await put(contract, rule("An  empty name is refused.", "EX-0001-0001-01"));
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      examples,
      `${head}| EX-0001-0001-01 | AC-0001-0001-01 | An empty name | 400 |\n| EX-0001-0001-02 | AC-0001-0001-01 | A long name | 400 |\n`,
    );
    await put(contract, rule("An empty name is refused.", "EX-0001-0001-01, EX-0001-0001-02"));
    git("add", ".");
    git("commit", "-m", "edit inside cells");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings
        .filter((item) => item.code === "QFAI-DRIFT-001")
        .map((item) => item.file)
        .sort(),
    ).toEqual([contract, examples].sort());
  });
});

describe("protected files whose content is unchanged", () => {
  const contract = `${specs}/03_contract/ui/ui-0001-form.yaml`;
  const policy = `${specs}/01_policy/glossary.md`;
  const front = `${specs}/01_policy/front.md`;
  const notes = `${specs}/01_policy/notes.md`;
  const flows = `${specs}/02_business-flow/business-flows.md`;
  const criteria = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md`;
  const plainRule = "  name: Required. At most 40 characters. Trimmed before saving.\n";
  const yamlBase = `# QFAI-CONTRACT-ID: UI-0001\nscreen: form\nrules:\n${plainRule}  max: 17\n  flag: yes\nbig: 12345678901234567891\n1: a\n`;
  const markdownBase =
    "# Terms\n\nA term is defined once and used\neverywhere else.\n\n| Term | Meaning |\n| --- | --- |\n| A | First |\n| B | Second |\n\n- one\n- two\n";
  const frontBase = "---\ntitle: Terms\nowner: docs\n---\n\nText.\n";
  const notesBase = "> # H\nbar\n\n<pre>\na\n\nb\nc\n</pre>\n";
  const gherkinBase =
    "# Acceptance Criteria\n\n```gherkin\nFeature: Form\n  Scenario: A name is checked\n    Then the name is required and is at most 40 characters\n```\n";

  async function commitBase(): Promise<void> {
    git("config", "core.autocrlf", "false");
    await put(decisions, table);
    await put(contract, yamlBase);
    await put(policy, markdownBase);
    await put(front, frontBase);
    await put(notes, notesBase);
    await put(criteria, gherkinBase);
    await put(flows, "# Flows\n\nEach flow is listed\nhere.\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
  }

  async function upstreamEdits(): Promise<(string | undefined)[]> {
    git("add", ".");
    git("commit", "-m", "edit");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    return findings
      .filter((item) => item.code === "QFAI-DRIFT-001")
      .map((item) => item.file)
      .sort();
  }

  // QFAI:EX-0001-0054-23
  it("needs no change request for a re-laid-out YAML or Markdown file", async () => {
    await commitBase();
    await put(
      contract,
      yamlBase.replace(
        plainRule,
        "  name: >-\n    Required.\n    At most 40 characters.\n    Trimmed before saving.\n",
      ),
    );
    // Re-wrapped, re-padded, with trailing whitespace, and stored with CRLF line endings.
    await put(
      policy,
      "# Terms  \n\nA term is defined once\nand used everywhere else.   \n\n| Term | Meaning |\n| ---- | ------- |\n| A    | First   |\n| B    | Second  |\n\n- one\n- two\n".replace(
        /\n/g,
        "\r\n",
      ),
    );
    expect(await upstreamEdits()).toEqual([]);
    // The working tree gets the same treatment: an uncommitted re-wrap is not named.
    await put(flows, "# Flows\n\nEach flow is listed here.\n");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(findings.filter((item) => item.code === "QFAI-DRIFT-004")).toEqual([]);
  });

  // QFAI:EX-0001-0054-24
  it.each([
    ["a YAML value whose case changed", contract, yamlBase.replace("Required.", "required.")],
    ["a YAML file that no longer parses", contract, `${yamlBase}  : broken: [\n`],
    ["a changed contract ID comment", contract, yamlBase.replace("UI-0001", "UI-0002")],
    ["an unknown YAML tag", contract, yamlBase.replace("screen: form", "screen: !page form")],
    ["017 in place of 17", contract, yamlBase.replace("max: 17", "max: 017")],
    ['"yes" in place of yes', contract, yamlBase.replace("flag: yes", 'flag: "yes"')],
    [
      "a large integer changed past double precision",
      contract,
      yamlBase.replace("567891", "567892"),
    ],
    ["a key 1 quoted as '1'", contract, yamlBase.replace("\n1: a\n", "\n'1': a\n")],
    ["prose whose punctuation changed", policy, markdownBase.replace("once and", "once, and")],
    ["prose whose case changed", policy, markdownBase.replace("A term", "a term")],
    ["prose whose inner spacing changed", policy, markdownBase.replace("once and", "once  and")],
    ["a hard break of two spaces", policy, markdownBase.replace("used\n", "used  \n")],
    ["a hard break of a backslash", policy, markdownBase.replace("used\n", "used\\\n")],
    ["two list items joined into one", policy, markdownBase.replace("- one\n- two", "- one - two")],
    ["two list items swapped", policy, markdownBase.replace("- one\n- two", "- two\n- one")],
    [
      "two table rows swapped",
      policy,
      markdownBase.replace("| A | First |\n| B | Second |", "| B | Second |\n| A | First |"),
    ],
    ["two front matter lines joined", front, frontBase.replace("Terms\nowner", "Terms owner")],
    ["a quoted heading joined to the next line", notes, notesBase.replace("# H\nbar", "# H bar")],
    [
      "two lines joined inside a pre element with a blank line",
      notes,
      notesBase.replace("b\nc\n</pre>", "b c\n</pre>"),
    ],
    [
      "a step split inside a fenced block",
      criteria,
      gherkinBase.replace("required and is", "required\n    And the name is"),
    ],
    [
      "a step re-wrapped inside a fenced block",
      criteria,
      gherkinBase.replace("required and is", "required and\n    is"),
    ],
  ])("still reports %s", async (_case, file, content) => {
    await commitBase();
    await put(file, content);
    expect(await upstreamEdits()).toEqual([file]);
  });

  // QFAI:EX-0001-0054-24
  it("still reports a protected path that HEAD holds as a symlink", async () => {
    await commitBase();
    const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
      cwd: root,
      input: "front.md",
      encoding: "utf8",
    }).trim();
    // Only the index changes, so the committed path is a symlink on every platform.
    git("update-index", "--cacheinfo", `120000,${blob},${policy}`);
    git("commit", "-m", "symlink");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings.filter((item) => item.code === "QFAI-DRIFT-001").map((item) => item.file),
    ).toEqual([policy]);
  });

  // QFAI:EX-0001-0054-24
  it("still names an uncommitted change of text", async () => {
    await commitBase();
    await put(flows, "# Flows\n\nEach flow is listed there.\n");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings.filter((item) => item.code === "QFAI-DRIFT-004").flatMap((item) => item.refs),
    ).toEqual([flows]);
  });
});

// Supplementary missing-root regression: existing page history prevents an absent-base exemption.
it("rejects a resolvable root-configured base with orphan page history before permissions", async () => {
  const rootDecision = "decisions.md";
  const page = "decisions/page-0001.md";
  const request = `| DEC-0002 | Change request: ${rootDecision}, ${page} | - Date: 2026-10-12 |\n`;
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
  git("commit", "-m", "valid head root and in-force request cannot waive unreadable base layout");
  const rootConfig = config();
  rootConfig.paths.specsDir = ".";
  rootConfig.paths.contractsDir = "03_contract";
  const findings = await validateStoryTreeDrift(root, rootConfig, "tdd");
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
