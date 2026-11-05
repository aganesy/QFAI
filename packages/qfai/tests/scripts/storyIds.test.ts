/**
 * The command that hands out story-tree IDs no open pull request has taken.
 *
 * The pure cases hold the reading of `git` output and the arithmetic on the IDs
 * read. The repository cases run the command against a temporary clone whose
 * `origin` is a local bare repository, with the REST listing replaced, so they
 * hold what reaches stdout and what the user's git configuration cannot change.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { nextStoryTreeId, readStoryTreeModel } from "../../src/core/storyTree/tree.js";
import {
  added,
  allocateAll,
  batchBlobs,
  collisionGuidance,
  collisions,
  fetchedHeads,
  otherHeads,
  parseScope,
  pullsFrom,
  registerRowIds,
  run,
} from "../../../../scripts/story-ids.mjs";

describe("scopes", () => {
  it.each([
    ["BF", { kind: "BF", parentId: undefined }],
    ["US-0001", { kind: "US", parentId: "BF-0001" }],
    ["AC-0001-0054", { kind: "AC", parentId: "US-0001-0054" }],
    ["EX-0001-0054", { kind: "EX", parentId: "US-0001-0054" }],
    ["BR-0016", { kind: "BR", parentId: "CLI-0016" }],
  ])("%s allocates under its parent", (scope, expected) => {
    expect(parseScope(scope)).toEqual(expected);
  });

  // A decision or question row takes the time it is written, not a candidate.
  it.each(["", "DEC", "OQ", "DECISION", "BR", "EX-0001", "US-0001-0001", "CLI", "dec"])(
    "refuses the scope %j",
    (scope) => {
      expect(parseScope(scope)).toBeUndefined();
    },
  );
});

describe("allocation", () => {
  const named = {
    declarations: ["DEC-0989", "EX-0001-0054-08", "BR-0016-0101"].map((id) => ({ id, file: "" })),
    decisions: { rows: [{ content: "Change request: x", approach: "retires BR-0016-0105" }] },
  };

  it("counts what a decision row names, and hands out a repeated scope twice", () => {
    const scopes = ["EX-0001-0054", "EX-0001-0054", "BR-0016"].map(parseScope);
    expect(allocateAll(scopes, named, nextStoryTreeId)).toEqual([
      "EX-0001-0054-09",
      "EX-0001-0054-10",
      "BR-0016-0106",
    ]);
  });

  it("answers nothing once a scope is full", () => {
    const full = { declarations: [{ id: "EX-0001-0054-99", file: "" }], decisions: { rows: [] } };
    expect(allocateAll([parseScope("EX-0001-0054")], full, nextStoryTreeId)).toBeUndefined();
  });
});

describe("collisions", () => {
  const base = new Set(["DEC-0989", "BR-0016-0099"]);

  it("names an ID this branch adds that another head adds too", () => {
    const mine = added(new Set(["DEC-0989", "DEC-20261105120000", "BR-0016-0100"]), base);
    const others = [
      { label: "main", ids: added(new Set(["DEC-0989", "DEC-20261105120000"]), base) },
      {
        label: "#12 (feature)",
        ids: added(new Set(["DEC-20261105120000", "BR-0016-0100"]), base),
      },
    ];
    expect(collisions(mine, others)).toEqual([
      { id: "BR-0016-0100", heads: ["#12 (feature)"] },
      { id: "DEC-20261105120000", heads: ["main", "#12 (feature)"] },
    ]);
  });

  it("guides a register collision to a new row and a story-tree one to renumbering", () => {
    const register = collisionGuidance([{ id: "OQ-20261105120000", heads: ["main"] }]);
    expect(register).toMatch(/delete this branch's own row and append it again/);
    expect(register).toMatch(/new timestamp ID/);
    expect(register).toMatch(/never renumber a row another branch holds/);
    expect(register).not.toMatch(/next <scope>/);
    const story = collisionGuidance([{ id: "BR-0016-0100", heads: ["main"] }]);
    expect(story).toMatch(/next <scope>/);
    expect(story).not.toMatch(/timestamp/);
  });

  it("leaves out a head this branch already contains, whatever its branch is called", () => {
    const pulls = [
      { number: 1, branch: "mine-under-another-name" },
      { number: 2, branch: "same-name-as-mine" },
      { number: 3, branch: "not-fetched" },
    ];
    const fetched = new Map([
      [1, "a".repeat(40)],
      [2, "b".repeat(40)],
    ]);
    expect(otherHeads(pulls, fetched, (commit: string) => commit === "a".repeat(40))).toEqual([
      { label: "#2 (same-name-as-mine)", commit: "b".repeat(40) },
    ]);
  });
});

describe("reading git and the hosted side", () => {
  it("takes number and branch from the listing", () => {
    const body = JSON.stringify([
      { number: 12, head: { ref: "feature" } },
      { head: { ref: "no-number" } },
    ]);
    expect(pullsFrom(body)).toEqual([{ number: 12, branch: "feature" }]);
    expect(pullsFrom("{}")).toBeUndefined();
    expect(pullsFrom("not json")).toBeUndefined();
  });

  it("takes each head's commit from FETCH_HEAD", () => {
    const fetchHead = [
      "0fbae1fb0d3485fc2ec18598948a60327ecb80c4\t\tbranch 'main' of https://github.com/owner/repo",
      "085cccdac1948e8c66568c4c8cabeb8bc3c8a23a\tnot-for-merge\t'refs/pull/2515/head' of https://github.com/owner/repo",
    ].join("\n");
    expect([...fetchedHeads(fetchHead)]).toEqual([
      [2515, "085cccdac1948e8c66568c4c8cabeb8bc3c8a23a"],
    ]);
  });

  it("reads cat-file --batch output byte by byte", () => {
    const body = "héllo\nworld";
    const size = Buffer.byteLength(body);
    const output = Buffer.from(
      `${"a".repeat(40)} blob ${String(size)}\n${body}\n${"b".repeat(40)} missing\n`,
    );
    expect([...batchBlobs(output)]).toEqual([["a".repeat(40), body]]);
  });

  it("reads another head's register IDs from the first cell, whatever its columns", () => {
    const text = [
      "| ID | Content | Approach | Status |",
      "| --- | --- | --- | --- |",
      "| DEC-0001 | Old layout | Names BF-0042 | DONE |",
      "| DEC-20261105120000 | New layout | Kept |",
      "| OQ-0003 | Question | - |",
      "| DEC-123 | Not an ID | - |",
    ].join("\n");
    const read = registerRowIds(text);
    expect(read.ids).toEqual(["DEC-0001", "DEC-20261105120000", "OQ-0003"]);
    expect(read.rows.map(({ content }) => content)).toEqual([
      "| DEC-0001 | Old layout | Names BF-0042 | DONE |",
      "| DEC-20261105120000 | New layout | Kept |",
      "| OQ-0003 | Question | - |",
    ]);
  });
});

describe("arguments", () => {
  it.each([
    [[]],
    [["list"]],
    [["next"]],
    [["next", "BR"]],
    [["next", "DEC"]],
    [["next", "OQ"]],
    [["next", "BF", "BR"]],
    [["check", "BF"]],
  ])("refuses %j before any call", async (argv) => {
    const list = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await run(argv, { list })).toBe(2);
      expect(list).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it("stops with exit 2 before any call on a runtime that cannot load the parser", async () => {
    const list = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const loadTree = () => Promise.reject(new Error('Unknown file extension ".ts"'));
      expect(await run(["next", "BF"], { list, loadTree })).toBe(2);
      expect(list).not.toHaveBeenCalled();
      expect(error.mock.calls.flat().join("\n")).toContain("Node.js 22.18 or later");
    } finally {
      error.mockRestore();
    }
  });
});

/** A register table in the current three-column layout. */
function register(title: string, rows: ReadonlyArray<[string, string]>): string {
  return [
    `# ${title}`,
    "",
    `## ${title}`,
    "",
    "| ID | Content | Approach |",
    "| --- | --- | --- |",
    ...rows.map(([id, approach]) => `| ${id} | Decision ${id} | ${approach} |`),
    "",
  ].join("\n");
}

const decisions = (...ids: string[]): string =>
  register(
    "Decisions",
    ids.map((id) => [id, "Kept"]),
  );

/** The four-column layout a head opened before the register redesign still holds. */
const fourColumnDecisions = (...ids: string[]): string =>
  [
    "# Decisions",
    "",
    "## Decisions",
    "",
    "| ID | Content | Approach | Status |",
    "| --- | --- | --- | --- |",
    ...ids.map((id) => `| ${id} | Decision ${id} | Kept | DONE |`),
    "",
  ].join("\n");

const fourColumnQuestions = (...ids: string[]): string =>
  fourColumnDecisions(...ids).replaceAll("Decisions", "Open Questions");

/** A clone whose `origin` is a bare repository standing in for GitHub. */
describe("against a repository", () => {
  let root: string;
  let work: string;
  const git = (cwd: string, ...args: string[]): string =>
    execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();
  const write = (file: string, text: string): void => {
    mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    writeFileSync(path.join(work, file), text);
  };
  const EXAMPLES =
    ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";
  const examples = (...rows: string[]): string =>
    [
      "# Examples",
      "",
      "| EX-ID | AC-Ref | Input | Expected |",
      "| --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n");
  const SENTINEL = "| EX-0001-0001-01 | AC-0001-0001-01 | a proposal names `BF-9999` | refused |";
  const pulls = [
    { number: 7, branch: "other" },
    { number: 8, branch: "mine-pushed-earlier" },
  ];
  const list = () => ({ code: 0, pulls });

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "story-ids-"));
    const bare = path.join(root, "origin.git");
    work = path.join(root, "work");
    git(root, "init", "-q", "--bare", "-b", "main", bare);
    git(root, "init", "-q", "-b", "main", work);
    git(work, "config", "user.email", "test@example.com");
    git(work, "config", "user.name", "test");
    git(work, "config", "commit.gpgsign", "false");
    // Settings that change what git prints or writes must not change the answer.
    git(work, "config", "fetch.writeFetchHEAD", "false");
    git(work, "config", "grep.lineNumber", "true");
    git(work, "config", "color.ui", "always");
    git(work, "remote", "add", "origin", bare);

    // Main still holds the four-column layout: the parser would refuse it.
    write(".qfai/spec/decisions.md", fourColumnDecisions("DEC-0001"));
    write(".qfai/spec/open-questions.md", fourColumnQuestions("OQ-0001"));
    write(".qfai/spec/02_business-flow/business-flow-0001/business-flow.md", "# BF-0001: Flow\n");
    write(EXAMPLES, examples(SENTINEL));
    git(work, "add", "-A");
    git(work, "commit", "-q", "-m", "base");
    git(work, "push", "-q", "origin", "main");

    git(work, "checkout", "-q", "-b", "other");
    write(".qfai/spec/decisions.md", decisions("DEC-0001", "DEC-20261105120000"));
    write(
      ".qfai/spec/open-questions.md",
      register("Open Questions", [
        ["OQ-0001", "Kept"],
        ["OQ-20261105120001", "Kept"],
      ]),
    );
    write(EXAMPLES, examples(SENTINEL, "| EX-0001-0001-02 | AC-0001-0001-01 | other | kept |"));
    git(work, "commit", "-q", "-am", "other");
    git(work, "push", "-q", "origin", "HEAD:refs/pull/7/head");

    git(work, "checkout", "-q", "main");
    git(work, "checkout", "-q", "-b", "mine");
    write(EXAMPLES, examples(SENTINEL, "| EX-0001-0001-03 | AC-0001-0001-01 | mine | kept |"));
    git(work, "commit", "-q", "-am", "mine, pushed");
    git(work, "push", "-q", "origin", "HEAD:refs/pull/8/head");
    write(
      EXAMPLES,
      examples(
        SENTINEL,
        "| EX-0001-0001-02 | AC-0001-0001-01 | mine | kept |",
        "| EX-0001-0001-03 | AC-0001-0001-01 | mine | kept |",
      ),
    );
    // The working tree converts the registers and appends one row in the same second as #7.
    write(".qfai/spec/decisions.md", decisions("DEC-0001", "DEC-20261105120000"));
    write(".qfai/spec/open-questions.md", register("Open Questions", [["OQ-0001", "Kept"]]));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("prints one ID per scope, reading four-column registers on main and the heads", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(await run(["next", "BF", "EX-0001-0001", "EX-0001-0001"], { cwd: work, list })).toBe(
        0,
      );
      expect(log.mock.calls).toEqual([["BF-0002"], ["EX-0001-0001-04"], ["EX-0001-0001-05"]]);
    } finally {
      log.mockRestore();
    }
  });

  it("names a same-second register ID and a story-tree ID another pull request adds", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await run(["check"], { cwd: work, list })).toBe(1);
      expect(log.mock.calls).toEqual([
        ["DEC-20261105120000 is also added by #7 (other)"],
        ["EX-0001-0001-02 is also added by #7 (other)"],
      ]);
      const guidance = error.mock.calls.flat().join("\n");
      expect(guidance).toMatch(/new timestamp ID/);
      expect(guidance).toMatch(/next <scope>/);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });

  it("passes a listing that crossed the reserve on as exit 1, with the answer printed", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(await run(["next", "BF"], { cwd: work, list: () => ({ code: 1, pulls }) })).toBe(1);
      expect(log.mock.calls).toEqual([["BF-0002"]]);
    } finally {
      log.mockRestore();
    }
  });

  // QFAI:EX-0001-0008-27
  it("allocates from complete listed pages and refuses an ignored unlisted entry", async () => {
    const target = path.join(work, ".qfai", "spec", "decisions.md");
    const original = readFileSync(target, "utf8");
    const directory = path.join(work, ".qfai", "spec", "decisions");
    const exclude = path.join(work, ".git", "info", "exclude");
    const originalExclude = readFileSync(exclude, "utf8");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      write(
        ".qfai/spec/decisions/page-0001.md",
        register("Decisions", [
          ["DEC-0001", "Kept"],
          ["DEC-0090", "Retires BF-0090"],
        ]),
      );
      write(
        ".qfai/spec/decisions.md",
        decisions().replace(
          "## Decisions",
          "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
        ),
      );
      expect(await run(["next", "BF"], { cwd: work, list })).toBe(0);
      expect(log.mock.calls).toEqual([["BF-0091"]]);
      log.mockClear();
      writeFileSync(exclude, `${originalExclude}\n.qfai/spec/decisions/orphan.md\n`);
      write(".qfai/spec/decisions/orphan.md", decisions("DEC-0990"));
      expect(await run(["next", "BF"], { cwd: work, list })).toBe(2);
      expect(log.mock.calls).toEqual([]);
      expect(error.mock.calls.flat().join(" ")).toMatch(/complete decision register/i);
    } finally {
      writeFileSync(target, original);
      writeFileSync(exclude, originalExclude);
      rmSync(directory, { recursive: true, force: true });
      log.mockRestore();
      error.mockRestore();
    }
  });

  async function refusesHistoricalRegisterFault(fault: string): Promise<void> {
    const target = path.join(work, ".qfai", "spec", "decisions.md");
    const page = path.join(work, ".qfai", "spec", "decisions", "page-0001.md");
    const original = readFileSync(target);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const text = decisions("DEC-0001");
      const pageText = fault === "duplicate" ? text : text.replace("| Kept |", "| Kept | extra |");
      write(".qfai/spec/decisions/page-0001.md", pageText);
      writeFileSync(
        target,
        decisions(...(fault === "duplicate" ? ["DEC-0001"] : [])).replace(
          "## Decisions",
          "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
        ),
      );
      const current = await readStoryTreeModel(work, defaultConfig);
      expect(current.decisionRegisterComplete).toBe(true);
      expect(current.decisions?.errors.length).toBeGreaterThan(0);
      expect(current.decisionOccurrences[0]?.origin.path).toBe(".qfai/spec/decisions/page-0001.md");
      expect(await run(["next", "BF"], { cwd: work, list })).toBe(2);
      expect(log.mock.calls).toEqual([]);
      expect(error.mock.calls.flat().join(" ")).toMatch(
        fault === "duplicate" ? /decisions\.md/ : /decisions\/page-0001\.md/,
      );
    } finally {
      writeFileSync(target, original);
      rmSync(page, { force: true });
      rmSync(path.dirname(page), { recursive: true, force: true });
      log.mockRestore();
      error.mockRestore();
    }
  }

  // QFAI:EX-0001-0053-26
  it("refuses allocation from a duplicate page/root occurrence", () =>
    refusesHistoricalRegisterFault("duplicate"));

  // QFAI:EX-0001-0053-31
  it("refuses allocation from a complete historical page with a fourth cell", () =>
    refusesHistoricalRegisterFault("fourth cell"));
});

describe("main IDs received through a merge", () => {
  it.each([
    { name: "excludes inherited DEC IDs after the merge is committed", commitMerge: true },
    {
      name: "refuses a pending merge before assigning inherited IDs to this branch",
      commitMerge: false,
    },
  ])("$name", async ({ commitMerge }) => {
    const root = mkdtempSync(path.join(os.tmpdir(), "story-ids-merge-"));
    const work = path.join(root, "work");
    const bare = path.join(root, "origin.git");
    const git = (cwd: string, ...args: string[]): string =>
      execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();
    const decisionFile = path.join(work, ".qfai", "spec", "decisions.md");
    const writeDecisions = (ids: string[]): void => {
      writeFileSync(decisionFile, decisions(...ids));
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      git(root, "init", "-q", "--bare", "-b", "main", bare);
      git(root, "init", "-q", "-b", "main", work);
      git(work, "config", "user.email", "test@example.com");
      git(work, "config", "user.name", "test");
      git(work, "config", "commit.gpgsign", "false");
      git(work, "remote", "add", "origin", bare);
      mkdirSync(path.dirname(decisionFile), { recursive: true });
      writeDecisions(["DEC-0001"]);
      git(work, "add", "-A");
      git(work, "commit", "-q", "-m", "base");
      const base = git(work, "rev-parse", "HEAD");
      git(work, "push", "-q", "origin", "main");

      const inherited = ["DEC-0001", "DEC-20261105120000", "DEC-20261105120001"];
      git(work, "checkout", "-q", "-b", "other");
      writeDecisions(inherited);
      git(work, "commit", "-q", "-am", "other IDs");
      git(work, "push", "-q", "origin", "HEAD:refs/pull/7/head");
      git(work, "checkout", "-q", "main");
      writeDecisions(inherited);
      git(work, "commit", "-q", "-am", "main IDs");
      git(work, "push", "-q", "origin", "main");
      git(work, "checkout", "-q", "-b", "mine", base);
      git(work, "commit", "-q", "--allow-empty", "-m", "feature without DEC changes");
      git(work, "merge", "--no-commit", "--no-ff", "main");
      if (commitMerge) {
        git(work, "commit", "-q", "-m", "merge main");
        expect(git(work, "rev-parse", "HEAD^2")).toBe(git(work, "rev-parse", "main"));
      } else {
        expect(git(work, "rev-parse", "--verify", "MERGE_HEAD")).toBe(
          git(work, "rev-parse", "main"),
        );
        expect(git(work, "show", "HEAD:.qfai/spec/decisions.md")).not.toContain(
          "DEC-20261105120000",
        );
      }

      const fetchHead = path.join(work, ".git", "FETCH_HEAD");
      if (!commitMerge) expect(existsSync(fetchHead)).toBe(false);

      const list = () => ({ code: 0, pulls: [{ number: 7, branch: "other" }] });
      const code = await run(["check"], { cwd: work, list });
      if (commitMerge) {
        expect(code).toBe(0);
        expect(log.mock.calls).toEqual([
          ["No ID this branch adds is taken elsewhere (0 checked)."],
        ]);
        expect(error.mock.calls).toEqual([]);
      } else {
        expect(code).toBe(2);
        expect(log.mock.calls).toEqual([]);
        expect(error.mock.calls.flat().join("\n")).toMatch(/finish.*merge/i);
        expect(existsSync(fetchHead)).toBe(false);
      }
      const output = [...log.mock.calls, ...error.mock.calls].flat().join("\n");
      expect(output).not.toMatch(/DEC-\d+.*also added|renumber|timestamp ID/i);
    } finally {
      log.mockRestore();
      error.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("parallel rows written in the same second", () => {
  it("reports a published worker's DEC collision before the other worker pushes", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "story-ids-parallel-dec-"));
    const first = path.join(root, "first");
    const second = path.join(root, "second");
    const bare = path.join(root, "origin.git");
    const hooks = path.join(root, "hooks");
    const git = (cwd: string, ...args: string[]): string =>
      execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();
    const writeDecisions = (cwd: string, ids: string[]): void => {
      const file = path.join(cwd, ".qfai", "spec", "decisions.md");
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, decisions(...ids));
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      git(root, "init", "-q", "--bare", "-b", "main", bare);
      git(root, "init", "-q", "-b", "main", first);
      git(first, "config", "user.email", "test@example.com");
      git(first, "config", "user.name", "test");
      git(first, "config", "commit.gpgsign", "false");
      git(first, "remote", "add", "origin", bare);
      writeDecisions(first, ["DEC-0001"]);
      git(first, "add", ".qfai/spec/decisions.md");
      git(first, "commit", "-q", "-m", "base");
      git(first, "push", "-q", "origin", "main");
      git(root, "clone", "-q", bare, second);
      git(first, "checkout", "-q", "-b", "first-worker");
      git(second, "checkout", "-q", "-b", "second-worker");

      mkdirSync(hooks);
      writeFileSync(
        path.join(hooks, "pre-push"),
        "#!/bin/sh\nprintf 'push\\n' >> .git/story-ids-push-attempts\n",
        { mode: 0o755 },
      );
      git(first, "config", "core.hooksPath", hooks);
      git(second, "config", "core.hooksPath", hooks);

      writeDecisions(first, ["DEC-0001", "DEC-20261105120000"]);
      writeDecisions(second, ["DEC-0001", "DEC-20261105120000"]);
      git(first, "commit", "-q", "-am", "first worker decision");
      git(first, "push", "-q", "origin", "HEAD:refs/pull/7/head");
      const secondPushCounter = path.join(second, ".git", "story-ids-push-attempts");
      const secondDecision = path.join(second, ".qfai", "spec", "decisions.md");
      const bytesBefore = readFileSync(secondDecision);
      const statusBefore = git(second, "status", "--porcelain");
      const refsBefore = git(bare, "for-each-ref", "--format=%(refname) %(objectname)");

      const list = () => ({ code: 0, pulls: [{ number: 7, branch: "first-worker" }] });
      expect(await run(["check"], { cwd: second, list })).toBe(1);
      expect(log.mock.calls).toEqual([["DEC-20261105120000 is also added by #7 (first-worker)"]]);
      expect(error.mock.calls.flat().join("\n")).toMatch(/append it again under a new timestamp/);
      expect(readFileSync(secondDecision)).toEqual(bytesBefore);
      expect(git(second, "status", "--porcelain")).toBe(statusBefore);
      expect(git(bare, "for-each-ref", "--format=%(refname) %(objectname)")).toBe(refsBefore);
      expect(existsSync(secondPushCounter)).toBe(false);

      // The second worker deletes its own row and appends it again one second later.
      writeDecisions(second, ["DEC-0001", "DEC-20261105120001"]);
      git(second, "config", "user.email", "test@example.com");
      git(second, "config", "user.name", "test");
      git(second, "config", "commit.gpgsign", "false");
      git(second, "commit", "-q", "-am", "second worker decision");
      log.mockClear();
      error.mockClear();
      expect(await run(["check"], { cwd: second, list })).toBe(0);
      expect(log.mock.calls).toEqual([["No ID this branch adds is taken elsewhere (1 checked)."]]);
      expect(error.mock.calls).toEqual([]);
      expect(existsSync(secondPushCounter)).toBe(false);
    } finally {
      log.mockRestore();
      error.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("ID candidate and pre-push guidance", () => {
  it("requires a fresh collision check without promising a reservation", () => {
    const naming = readFileSync(
      new URL("../../../../.instruction/02_project/naming.md", import.meta.url),
      "utf-8",
    );
    const idFormats = naming.split("## ID Formats")[1]?.split("## Contracts")[0] ?? "";
    const prose = idFormats.replace(/\s+/g, " ");
    expect(prose).toMatch(/candidate/i);
    expect(prose).toMatch(/not (?:an? )?reservation/i);
    expect(prose).toMatch(/check[^.]*before[^.]*push/i);
    expect(prose).toMatch(/(?:renumber|reallocate)[^.]*check (?:again|once more)/i);
    expect(prose).toMatch(/commit[^.]*before[^.]*check/i);
    expect(prose).toMatch(/clean (?:index and )?working tree/i);
    expect(prose).toMatch(/push[^.]*same[^.]*HEAD/i);
    expect(prose).toMatch(/after[^.]*change[^.]*check again/i);
    expect(prose).toMatch(/unpublished/i);
    expect(prose).toMatch(/simultaneous/i);
    expect(prose).toMatch(/(?:cannot|does not|no)[^.]*guarantee/i);
    expect(prose).not.toContain("so parallel branches do not pick the same number");
  });

  it("takes a decision or question ID from the time its row is written", () => {
    const naming = readFileSync(
      new URL("../../../../.instruction/02_project/naming.md", import.meta.url),
      "utf-8",
    ).replace(/\s+/g, " ");
    expect(naming).toContain("DEC-yyyymmddhhMMss");
    expect(naming).toContain("OQ-yyyymmddhhMMss");
    expect(naming).toMatch(/UTC/);
    expect(naming).not.toMatch(/story-ids\.mjs next (?:DEC|OQ)\b/);
  });
});
