/**
 * The command that reads a pull request's review state.
 *
 * Nothing here makes a call: `git` and `gh` are stubbed. Most cases hold the
 * reading of a response, because a mistake there reads as a pull request with
 * nothing open: a resolved thread counted, a changed response shape taken for an
 * empty list, or a Codex comment from another author reported as a review.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ list: [] as string[][], threadAnswer: "", issueAnswer: "" }));

vi.mock("node:child_process", () => ({
  execFileSync: (command: string, args: string[]): string => {
    calls.list.push([command, ...args]);
    if (command === "git") return "https://github.com/aganesy/QFAI.git\n";
    if (args.some((arg) => arg.includes("PullRequestReviewThread"))) return calls.threadAnswer;
    if (args.includes("--paginate")) return calls.issueAnswer;
    return "{}";
  },
}));

import {
  codexFindings,
  deferralProgress,
  deferredEntry,
  foreignThread,
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
        id: "T1",
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
      "Deferred from pull request 12: src/a.ts:7, by @reviewer.\nThread: https://example.test/c/1\n\nCover it.\n\n<!-- qfai-deferred-thread:T1 -->",
    );
  });

  it("is undefined for a thread whose id the answer does not give", () => {
    expect(deferredEntry("12", node({ id: null }))).toBeUndefined();
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

describe("whether a deferred thread belongs to the pull request it was given", () => {
  const owned = (pullRequest: unknown): unknown => ({ data: { node: { path: "a", pullRequest } } });
  const of = (number: unknown, nameWithOwner: unknown): unknown =>
    owned({ number, repository: { nameWithOwner } });

  it("accepts a thread of that pull request in that repository", () => {
    expect(foreignThread("aganesy/QFAI", "12", of(12, "aganesy/QFAI"))).toBeUndefined();
  });

  it("reads the repository name without regard to case, as GitHub does", () => {
    expect(foreignThread("Aganesy/qfai", "12", of(12, "aganesy/QFAI"))).toBeUndefined();
  });

  it("names the pull request a thread of another pull request belongs to", () => {
    expect(foreignThread("aganesy/QFAI", "12", of(13, "aganesy/QFAI"))).toBe(
      "The thread belongs to aganesy/QFAI#13, not aganesy/QFAI#12.",
    );
  });

  it("names the repository a thread of another repository belongs to", () => {
    expect(foreignThread("aganesy/QFAI", "12", of(12, "someone/fork"))).toBe(
      "The thread belongs to someone/fork#12, not aganesy/QFAI#12.",
    );
  });

  it("reads a pull request number written with leading zeros as that number", () => {
    expect(foreignThread("aganesy/QFAI", "012", of(12, "aganesy/QFAI"))).toBeUndefined();
  });

  it("refuses a thread whose pull request the answer does not name", () => {
    expect(foreignThread("aganesy/QFAI", "12", owned(null))).toBe(
      "GitHub's answer does not name the pull request that thread belongs to.",
    );
    expect(foreignThread("aganesy/QFAI", "12", of("12", "aganesy/QFAI"))).toBe(
      "GitHub's answer does not name the pull request that thread belongs to.",
    );
  });
});

describe("deferring a thread of another pull request", () => {
  afterEach(() => {
    calls.list.length = 0;
    vi.restoreAllMocks();
  });

  const answer = (number: number, nameWithOwner: string): string =>
    JSON.stringify({
      data: {
        node: {
          id: "T1",
          isResolved: false,
          path: "src/a.ts",
          line: 7,
          pullRequest: { number, repository: { nameWithOwner } },
          comments: {
            nodes: [{ url: "https://x/c/1", author: { login: "reviewer" }, body: "Cover it." }],
          },
          latest: { nodes: [{ body: "Cover it." }] },
        },
      },
    });

  it.each([
    ["another pull request", answer(13, "aganesy/QFAI")],
    ["another repository", answer(12, "someone/fork")],
  ])("of %s stops with 2 and makes no write", (_label, threadAnswer) => {
    calls.threadAnswer = threadAnswer;
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(2);
    const ghCalls = calls.list.filter(([command]) => command === "gh");
    expect(ghCalls).toHaveLength(1);
    expect(ghCalls[0]?.join(" ")).toContain("PullRequestReviewThread");
    expect(error.mock.calls.join(" ")).toContain("Nothing was recorded, replied to or resolved.");
  });

  it("of the requested pull request records, replies and resolves", () => {
    calls.threadAnswer = answer(12, "aganesy/QFAI");
    calls.issueAnswer = "";
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(0);
    const ghCalls = calls.list.filter(([command]) => command === "gh").map((c) => c.join(" "));
    expect(ghCalls).toHaveLength(5);
    expect(ghCalls[1]).toContain("--paginate repos/aganesy/QFAI/issues/40/comments");
    expect(ghCalls[2]).toContain("repos/aganesy/QFAI/issues/40/comments -f body=");
    expect(ghCalls[3]).toContain("addPullRequestReviewThreadReply");
    expect(ghCalls[4]).toContain("resolveReviewThread");
  });
});

describe("retrying a deferral that stopped part way", () => {
  afterEach(() => {
    calls.list.length = 0;
    vi.restoreAllMocks();
  });

  const answer = (isResolved: boolean, replies: string[]): string =>
    JSON.stringify({
      data: {
        node: {
          id: "T1",
          isResolved,
          path: "src/a.ts",
          line: 7,
          pullRequest: { number: 12, repository: { nameWithOwner: "aganesy/QFAI" } },
          comments: {
            nodes: [{ url: "https://x/c/1", author: { login: "reviewer" }, body: "Cover it." }],
          },
          latest: { nodes: [{ body: "Cover it." }, ...replies.map((body) => ({ body }))] },
        },
      },
    });
  const recorded = `${JSON.stringify("Deferred from pull request 12.\n\n<!-- qfai-deferred-thread:T1 -->")}\n`;

  const writes = (): string[] =>
    calls.list
      .filter(([command]) => command === "gh")
      .slice(2)
      .map((c) => c.join(" "));

  it("after the issue entry was posted, replies and resolves without posting it again", () => {
    calls.threadAnswer = answer(false, []);
    calls.issueAnswer = recorded;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(0);
    expect(writes()).toHaveLength(2);
    expect(writes()[0]).toContain("addPullRequestReviewThreadReply");
    expect(writes()[1]).toContain("resolveReviewThread");
  });

  it("after the reply was posted too, only resolves", () => {
    calls.threadAnswer = answer(false, ["Deferred to #40."]);
    calls.issueAnswer = recorded;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(0);
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toContain("resolveReviewThread");
  });

  it("after every step, writes nothing and says the thread is already deferred", () => {
    calls.threadAnswer = answer(true, ["Deferred to #40."]);
    calls.issueAnswer = recorded;
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(0);
    expect(writes()).toHaveLength(0);
    expect(log.mock.calls.join(" ")).toContain("already deferred");
  });
});

describe("which steps of a deferral are already done", () => {
  const thread = (isResolved: unknown, replies: unknown): unknown => ({
    data: { node: { id: "T1", isResolved, latest: { nodes: replies } } },
  });

  it("finds nothing done on a fresh thread and an issue without its entry", () => {
    expect(deferralProgress("T1", "40", thread(false, [{ body: "Cover it." }]), [])).toEqual({
      recorded: false,
      replied: false,
      resolved: false,
    });
  });

  it("counts an issue entry only when it carries this thread's id", () => {
    const other = deferralProgress("T1", "40", thread(false, []), [
      "<!-- qfai-deferred-thread:T10 -->",
      "<!-- qfai-deferred-thread:T2 -->",
    ]);
    expect(other.recorded).toBe(false);
    const own = deferralProgress("T1", "40", thread(false, []), [
      "Finding.\n\n<!-- qfai-deferred-thread:T1 -->",
    ]);
    expect(own.recorded).toBe(true);
  });

  it("counts a reply only when it names the same follow-up issue", () => {
    expect(
      deferralProgress("T1", "40", thread(false, [{ body: "Deferred to #41." }]), []).replied,
    ).toBe(false);
    expect(
      deferralProgress("T1", "40", thread(false, [{ body: " Deferred to #40.\n" }]), []).replied,
    ).toBe(true);
  });

  it("reads the thread as resolved only when the answer says so", () => {
    expect(deferralProgress("T1", "40", thread(true, []), []).resolved).toBe(true);
    expect(deferralProgress("T1", "40", thread("yes", null), []).resolved).toBe(false);
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
