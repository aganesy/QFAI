/**
 * The command that reads a pull request's review state.
 *
 * Nothing here makes a call. What the cases hold is the reading of a response,
 * because a mistake there reads as a pull request with nothing open: a resolved
 * thread counted, a changed response shape taken for an empty list, or a Codex
 * comment from another author reported as a review.
 */
import { describe, expect, it } from "vitest";

import {
  codexFindings,
  deferredEntry,
  formatThread,
  run,
  unresolvedThreads,
} from "../../../../scripts/pr-threads.mjs";

function thread(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "T1",
    isResolved: false,
    isOutdated: false,
    path: "src/a.ts",
    line: 7,
    comments: { nodes: [{ author: { login: "reviewer" }, body: "Handle the empty case." }] },
    ...overrides,
  };
}

function response(nodes: unknown): unknown {
  return { data: { repository: { pullRequest: { reviewThreads: { nodes } } } } };
}

describe("the unresolved threads of a response", () => {
  it("keeps only threads that are not resolved", () => {
    const rows = unresolvedThreads(
      response([thread({ id: "open" }), thread({ id: "done", isResolved: true })]),
    );
    expect(rows?.map((row) => row.id)).toEqual(["open"]);
  });

  it("carries the location, the author and the first comment", () => {
    const [row] = unresolvedThreads(response([thread({ isOutdated: true })])) ?? [];
    expect(row).toEqual({
      id: "T1",
      path: "src/a.ts",
      line: 7,
      outdated: true,
      author: "reviewer",
      body: "Handle the empty case.",
    });
  });

  it("copes with a thread whose line and first comment are gone", () => {
    const [row] =
      unresolvedThreads(response([thread({ line: null, comments: { nodes: [] } })])) ?? [];
    expect(row?.line).toBeUndefined();
    expect(row?.author).toBe("unknown");
    expect(row?.body).toBe("");
  });

  it("is undefined for a response without the threads list", () => {
    expect(unresolvedThreads({ data: null })).toBeUndefined();
    expect(unresolvedThreads(undefined)).toBeUndefined();
  });

  it("is empty for a pull request with no thread", () => {
    expect(unresolvedThreads(response([]))).toEqual([]);
  });
});

describe("the Codex review comments", () => {
  const codex = "chatgpt-codex-connector[bot]";

  it("keeps a Codex comment that carries a review", () => {
    const found = codexFindings([
      { user: { login: codex }, body: "Codex Review: one finding", html_url: "https://x/1" },
    ]);
    expect(found).toEqual([{ url: "https://x/1", body: "Codex Review: one finding" }]);
  });

  it("drops a comment by another author and a Codex comment that is no review", () => {
    expect(
      codexFindings([
        { user: { login: "someone" }, body: "Codex Review: pasted" },
        { user: { login: codex }, body: "You have reached your usage limit." },
      ]),
    ).toEqual([]);
  });

  it("is empty for a response that is not a list", () => {
    expect(codexFindings({ message: "Not Found" })).toEqual([]);
  });
});

describe("one thread as output", () => {
  it("names the id, the location and the author, then the comment", () => {
    const [row] = unresolvedThreads(response([thread({})])) ?? [];
    expect(row).toBeDefined();
    expect(formatThread(row as NonNullable<typeof row>)).toBe(
      "- T1  src/a.ts:7  @reviewer\nHandle the empty case.",
    );
  });

  it("marks an outdated thread and shortens a long comment", () => {
    const [row] =
      unresolvedThreads(
        response([
          thread({
            isOutdated: true,
            line: null,
            comments: { nodes: [{ author: { login: "bot" }, body: "x".repeat(1000) }] },
          }),
        ]),
      ) ?? [];
    const text = formatThread(row as NonNullable<typeof row>);
    expect(text.split("\n")[0]).toBe("- T1  src/a.ts  @bot, outdated");
    expect(text.endsWith("...")).toBe(true);
    expect(text.length).toBeLessThan(700);
  });
});

describe("the entry a deferred finding leaves in the follow-up issue", () => {
  const node = (overrides: Record<string, unknown>): unknown => ({
    data: {
      node: {
        path: "src/a.ts",
        line: 7,
        comments: {
          nodes: [
            { url: "https://example.test/c/1", author: { login: "reviewer" }, body: " Cover it. " },
          ],
        },
        ...overrides,
      },
    },
  });

  it("names the pull request, the location, the author and the thread, then the finding", () => {
    expect(deferredEntry("12", node({}))).toBe(
      "Deferred from pull request 12: src/a.ts:7, by @reviewer.\nThread: https://example.test/c/1\n\nCover it.",
    );
  });

  it("names the file alone for a thread with no line", () => {
    expect(
      deferredEntry("12", node({ line: null }))?.startsWith(
        "Deferred from pull request 12: src/a.ts,",
      ),
    ).toBe(true);
  });

  it("is undefined for an id that names no thread", () => {
    expect(deferredEntry("12", { data: { node: null } })).toBeUndefined();
  });
});

describe("the arguments", () => {
  it.each([
    [["defer", "1", "T1"]],
    [["defer", "x", "T1", "2"]],
    [["defer", "1", "T1", "two"]],
    [[]],
    [["merge"]],
    [["list"]],
    [["list", "abc"]],
    [["list", "1", "2"]],
    [["reply", "T1"]],
    [["resolve"]],
  ])("%j is refused before any call", (argv) => {
    expect(run(argv)).toBe(2);
  });
});
