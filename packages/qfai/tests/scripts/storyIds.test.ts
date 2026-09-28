/**
 * The command that hands out story-tree IDs no open pull request has taken.
 *
 * The pure cases hold the reading of `git` output and the arithmetic on the IDs
 * read. The repository cases run the command against a temporary clone whose
 * `origin` is a local bare repository, with the REST listing replaced, so they
 * hold what reaches stdout and what the user's git configuration cannot change.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
