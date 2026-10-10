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

import { nextStoryTreeId } from "../../src/core/storyTree/tree.js";
import {
  added,
  allocateAll,
  batchBlobs,
  collisions,
  fetchedHeads,
  otherHeads,
  parseScope,
  pullsFrom,
  run,
} from "../../../../scripts/story-ids.mjs";

describe("scopes", () => {
  it.each([
    ["DEC", { kind: "DEC", parentId: undefined }],
    ["BF", { kind: "BF", parentId: undefined }],
    ["US-0001", { kind: "US", parentId: "BF-0001" }],
    ["AC-0001-0054", { kind: "AC", parentId: "US-0001-0054" }],
    ["EX-0001-0054", { kind: "EX", parentId: "US-0001-0054" }],
    ["BR-0016", { kind: "BR", parentId: "CLI-0016" }],
  ])("%s allocates under its parent", (scope, expected) => {
    expect(parseScope(scope)).toEqual(expected);
  });

  it.each(["", "DECISION", "BR", "EX-0001", "US-0001-0001", "CLI", "dec"])(
    "refuses the scope %j",
    (scope) => {
      expect(parseScope(scope)).toBeUndefined();
    },
  );
});

describe("allocation", () => {
  const named = {
    declarations: ["DEC-0989", "EX-0001-0054-08", "BR-0016-0101"].map((id) => ({ id, file: "" })),
    decisions: { rows: [{ content: "Change request: x", approach: "retires DEC-0990" }] },
  };

  it("counts what a decision row names, and hands out a repeated scope twice", () => {
    const scopes = ["DEC", "EX-0001-0054", "EX-0001-0054", "BR-0016"].map(parseScope);
    expect(allocateAll(scopes, named, nextStoryTreeId)).toEqual([
      "DEC-0991",
      "EX-0001-0054-09",
      "EX-0001-0054-10",
      "BR-0016-0102",
    ]);
  });

  it("does not read DEC-09901 as DEC-0990", () => {
    const rows = [{ content: "Change request: x", approach: "mentions DEC-09901" }];
    expect(
      allocateAll([parseScope("DEC")], { declarations: [], decisions: { rows } }, nextStoryTreeId),
    ).toEqual(["DEC-0001"]);
  });

  it("answers nothing once a scope is full", () => {
    const full = { declarations: [{ id: "EX-0001-0054-99", file: "" }], decisions: { rows: [] } };
    expect(allocateAll([parseScope("EX-0001-0054")], full, nextStoryTreeId)).toBeUndefined();
  });
});

describe("collisions", () => {
  const base = new Set(["DEC-0989", "BR-0016-0099"]);

  it("names an ID this branch adds that another head adds too", () => {
    const mine = added(new Set(["DEC-0989", "DEC-0990", "BR-0016-0100"]), base);
    const others = [
      { label: "main", ids: added(new Set(["DEC-0989", "DEC-0990"]), base) },
      { label: "#12 (feature)", ids: added(new Set(["DEC-0990", "BR-0016-0100"]), base) },
    ];
    expect(collisions(mine, others)).toEqual([
      { id: "BR-0016-0100", heads: ["#12 (feature)"] },
      { id: "DEC-0990", heads: ["main", "#12 (feature)"] },
    ]);
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
});

describe("arguments", () => {
  it.each([
    [[]],
    [["list"]],
    [["next"]],
    [["next", "BR"]],
    [["next", "DEC", "BR"]],
    [["check", "DEC"]],
  ])("refuses %j before any call", async (argv) => {
    const list = vi.fn();
    expect(await run(argv, { list })).toBe(2);
    expect(list).not.toHaveBeenCalled();
  });

  it("stops with exit 2 before any call on a runtime that cannot load the parser", async () => {
    const list = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const loadTree = () => Promise.reject(new Error('Unknown file extension ".ts"'));
      expect(await run(["next", "DEC"], { list, loadTree })).toBe(2);
      expect(list).not.toHaveBeenCalled();
      expect(error.mock.calls.flat().join("\n")).toContain("Node.js 22.18 or later");
    } finally {
      error.mockRestore();
    }
  });
});

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
  const decisions = (...ids: string[]): string =>
    [
      "# Decisions",
      "",
      "## Decisions",
      "",
      "| ID | Content | Approach | Status |",
      "| --- | --- | --- | --- |",
      ...ids.map((id) => `| ${id} | Change request: x | - Date: 2026-09-28 | DONE |`),
      "",
    ].join("\n");
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

    write(".qfai/spec/decisions.md", decisions("DEC-0001"));
    write(".qfai/spec/02_business-flow/business-flow-0001/business-flow.md", "# BF-0001: Flow\n");
    write(EXAMPLES, examples(SENTINEL));
    git(work, "add", "-A");
    git(work, "commit", "-q", "-m", "base");
    git(work, "push", "-q", "origin", "main");

    git(work, "checkout", "-q", "-b", "other");
    write(".qfai/spec/decisions.md", decisions("DEC-0001", "DEC-0002"));
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
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("prints exactly one ID per scope on stdout, ignoring an ID written only in prose", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(
        await run(["next", "DEC", "BF", "EX-0001-0001", "EX-0001-0001"], { cwd: work, list }),
      ).toBe(0);
      expect(log.mock.calls).toEqual([
        ["DEC-0003"],
        ["BF-0002"],
        ["EX-0001-0001-04"],
        ["EX-0001-0001-05"],
      ]);
    } finally {
      log.mockRestore();
    }
  });

  it("names the collision with another pull request and not with this branch's own", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await run(["check"], { cwd: work, list })).toBe(1);
      expect(log.mock.calls).toEqual([["EX-0001-0001-02 is also added by #7 (other)"]]);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });

  it("passes a listing that crossed the reserve on as exit 1, with the answer printed", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      expect(await run(["next", "DEC"], { cwd: work, list: () => ({ code: 1, pulls }) })).toBe(1);
      expect(log.mock.calls).toEqual([["DEC-0003"]]);
    } finally {
      log.mockRestore();
    }
  });
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
      writeFileSync(
        decisionFile,
        [
          "# Decisions",
          "",
          "## Decisions",
          "",
          "| ID | Content | Approach | Status |",
          "| --- | --- | --- | --- |",
          ...ids.map((id) => `| ${id} | Change request: x | - Date: 2026-09-28 | DONE |`),
          "",
        ].join("\n"),
      );
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

      const inherited = [
        "DEC-0001",
        "DEC-0002",
        "DEC-0003",
        "DEC-0004",
        "DEC-0005",
        "DEC-0006",
        "DEC-0007",
      ];
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
        expect(git(work, "show", "HEAD:.qfai/spec/decisions.md")).not.toContain("DEC-0002");
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
      expect(output).not.toMatch(/DEC-\d{4}.*also added|renumber/i);
    } finally {
      log.mockRestore();
      error.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("parallel DEC candidates before push", () => {
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
      writeFileSync(
        file,
        [
          "# Decisions",
          "",
          "## Decisions",
          "",
          "| ID | Content | Approach | Status |",
          "| --- | --- | --- | --- |",
          ...ids.map((id) => `| ${id} | Change request: x | - Date: 2026-09-28 | DONE |`),
          "",
        ].join("\n"),
      );
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
      const noPulls = () => ({ code: 0, pulls: [] });
      expect(await run(["next", "DEC"], { cwd: first, list: noPulls })).toBe(0);
      expect(await run(["next", "DEC"], { cwd: second, list: noPulls })).toBe(0);
      expect(log.mock.calls).toEqual([["DEC-0002"], ["DEC-0002"]]);
      log.mockClear();
      error.mockClear();

      writeDecisions(first, ["DEC-0001", "DEC-0002"]);
      writeDecisions(second, ["DEC-0001", "DEC-0002"]);
      git(first, "commit", "-q", "-am", "first worker decision");
      git(first, "push", "-q", "origin", "HEAD:refs/pull/7/head");
      expect(readFileSync(path.join(first, ".git", "story-ids-push-attempts"), "utf-8")).toBe(
        "push\n",
      );
      const secondPushCounter = path.join(second, ".git", "story-ids-push-attempts");
      expect(existsSync(secondPushCounter)).toBe(false);
      const secondDecision = path.join(second, ".qfai", "spec", "decisions.md");
      const bytesBefore = readFileSync(secondDecision);
      const statusBefore = git(second, "status", "--porcelain");
      const refsBefore = git(bare, "for-each-ref", "--format=%(refname) %(objectname)");
      expect(refsBefore).not.toContain("refs/heads/second-worker");

      const list = () => ({
        code: 0,
        pulls: [{ number: 7, branch: "first-worker" }],
      });
      expect(await run(["check"], { cwd: second, list })).toBe(1);
      expect(log.mock.calls).toEqual([["DEC-0002 is also added by #7 (first-worker)"]]);
      expect(error.mock.calls.flat().join("\n")).toContain("Renumber these");
      expect(readFileSync(secondDecision)).toEqual(bytesBefore);
      expect(git(second, "status", "--porcelain")).toBe(statusBefore);
      expect(git(bare, "for-each-ref", "--format=%(refname) %(objectname)")).toBe(refsBefore);
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
});
