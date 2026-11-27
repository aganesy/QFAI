/**
 * The command that reads a pull request's review state.
 *
 * Nothing here makes a call: `git` and `gh` are stubbed. Most cases hold the
 * reading of a response, because a mistake there reads as a pull request with
 * nothing open: a resolved thread counted, a changed response shape taken for an
 * empty list, or a Codex comment from another author reported as a review.
 */
import type * as NodeFs from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  list: [] as string[][],
  threadAnswer: "",
  issueAnswer: "",
  threadPages: [] as string[],
  commentPages: [] as string[],
  failGh: undefined as ((args: string[]) => Error | undefined) | undefined,
  malformedGh: "",
}));

vi.mock("node:child_process", () => ({
  execFileSync: (command: string, args: string[]): string => {
    calls.list.push([command, ...args]);
    if (command === "git") return "https://github.com/aganesy/QFAI.git\n";
    const failure = calls.failGh?.(args);
    if (failure !== undefined) throw failure;
    if (calls.malformedGh !== "" && args.some((arg) => arg.includes(calls.malformedGh))) {
      return "<html>Bad gateway</html>";
    }
    if (args.some((arg) => arg.includes("reviewThreads(")))
      return calls.threadPages.shift() ?? "{}";
    if (args[1] === "-i") return calls.commentPages.shift() ?? "HTTP/2.0 404 Not Found\n\n{}";
    if (args.some((arg) => arg.includes("PullRequestReviewThread"))) return calls.threadAnswer;
    if (args.includes("--paginate")) return calls.issueAnswer;
    return "{}";
  },
}));

// No saved budget reading: one left on this machine must not stop a listing.
vi.mock("../../../../scripts/lib/bounded-read.mjs", () => ({
  readBoundedText: (): undefined => undefined,
}));

// No reading is saved either: the cache directory cannot be created, so a case
// that answers with a low budget leaves nothing behind to stop a real call.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>();
  return {
    ...actual,
    mkdirSync: (): never => {
      throw Object.assign(new Error("EACCES: permission denied, mkdir"), { code: "EACCES" });
    },
  };
});

import {
  codexFindings,
  deferralProgress,
  deferredEntry,
  foreignThread,
  formatThread,
  previousCursor,
  run,
  unresolvedThreads,
} from "../../../../scripts/pr-threads.mjs";

function deferralWrites(): string[] {
  return calls.list
    .filter(([command, operation, ...args]) => {
      if (command !== "gh" || operation !== "api") return false;
      if (args.includes("graphql")) {
        return args.some((argument) => /^query=\s*mutation\b/u.test(argument));
      }
      const methodFlag = args.findIndex((argument) => argument === "--method" || argument === "-X");
      const method = methodFlag >= 0 ? args[methodFlag + 1]?.toUpperCase() : undefined;
      return method === undefined
        ? args.some((argument) =>
            ["-f", "-F", "--raw-field", "--field", "--input"].includes(argument),
          )
        : method !== "GET" && method !== "HEAD";
    })
    .map((call) => call.join(" "));
}

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

  it("distinguishes a parameterized attached-method read from an attached write", () => {
    const endpoint = "repos/example/project/issues/40/comments";
    const write = ["gh", "api", endpoint, "--method=POST"];
    calls.list.push(["gh", "api", endpoint, "--method=GET", "-F", "per_page=100"], write);
    expect(deferralWrites()).toEqual([write.join(" ")]);
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

  it("after the issue entry was posted, replies and resolves without posting it again", () => {
    calls.threadAnswer = answer(false, []);
    calls.issueAnswer = recorded;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(0);
    const writes = deferralWrites();
    expect(writes).toHaveLength(2);
    expect(writes[0]).toContain("addPullRequestReviewThreadReply");
    expect(writes[1]).toContain("resolveReviewThread");
  });

  it("finds its own entry when GitHub answers with another form of the given thread id", () => {
    calls.threadAnswer = answer(false, []);
    calls.issueAnswer = recorded;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "MDI0OlB1bGxSZXF1ZXN0UmV2aWV3VGhyZWFkMQ==", "40"])).toBe(0);
    const writes = deferralWrites();
    expect(writes).toHaveLength(2);
    expect(writes[0]).toContain("addPullRequestReviewThreadReply");
    expect(writes[1]).toContain("resolveReviewThread");
  });

  it("after the reply was posted too, only resolves", () => {
    calls.threadAnswer = answer(false, ["Deferred to #40."]);
    calls.issueAnswer = recorded;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(0);
    const writes = deferralWrites();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("resolveReviewThread");
  });

  it("after every step, writes nothing and says the thread is already deferred", () => {
    calls.threadAnswer = answer(true, ["Deferred to #40."]);
    calls.issueAnswer = recorded;
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(run(["defer", "12", "T1", "40"])).toBe(0);
    expect(deferralWrites()).toHaveLength(0);
    expect(log.mock.calls.join(" ")).toContain("already deferred");
  });
});

describe("which steps of a deferral are already done", () => {
  const thread = (isResolved: unknown, replies: unknown): unknown => ({
    data: { node: { id: "T1", isResolved, latest: { nodes: replies } } },
  });

  it("finds nothing done on a fresh thread and an issue without its entry", () => {
    expect(deferralProgress("40", thread(false, [{ body: "Cover it." }]), [])).toEqual({
      recorded: false,
      replied: false,
      resolved: false,
    });
  });

  it("counts an issue entry only when it carries this thread's id", () => {
    const other = deferralProgress("40", thread(false, []), [
      "<!-- qfai-deferred-thread:T10 -->",
      "<!-- qfai-deferred-thread:T2 -->",
    ]);
    expect(other.recorded).toBe(false);
    const own = deferralProgress("40", thread(false, []), [
      "Finding.\n\n<!-- qfai-deferred-thread:T1 -->",
    ]);
    expect(own.recorded).toBe(true);
  });

  it("counts no issue entry when GitHub's answer names no thread id", () => {
    const answer = { data: { node: { isResolved: false, latest: { nodes: [] } } } };
    expect(
      deferralProgress("40", answer, ["<!-- qfai-deferred-thread:undefined -->"]).recorded,
    ).toBe(false);
  });

  it("counts a reply only when it names the same follow-up issue", () => {
    expect(deferralProgress("40", thread(false, [{ body: "Deferred to #41." }]), []).replied).toBe(
      false,
    );
    expect(
      deferralProgress("40", thread(false, [{ body: " Deferred to #40.\n" }]), []).replied,
    ).toBe(true);
  });

  it("reads the thread as resolved only when the answer says so", () => {
    expect(deferralProgress("40", thread(true, []), []).resolved).toBe(true);
    expect(deferralProgress("40", thread("yes", null), []).resolved).toBe(false);
  });
});

describe("the cursor of the page of threads before this one", () => {
  const paged = (pageInfo: unknown): unknown => ({
    data: { repository: { pullRequest: { reviewThreads: { pageInfo, nodes: [] } } } },
  });

  it("is the start cursor while an earlier page exists", () => {
    expect(previousCursor(paged({ hasPreviousPage: true, startCursor: "c1" }))).toBe("c1");
  });

  it("is undefined on the first page or without page information", () => {
    expect(previousCursor(paged({ hasPreviousPage: false, startCursor: "c1" }))).toBeUndefined();
    expect(previousCursor(paged({ hasPreviousPage: true, startCursor: null }))).toBeUndefined();
    expect(previousCursor(response([]))).toBeUndefined();
  });
});

describe("listing a pull request that holds more than one page", () => {
  afterEach(() => {
    calls.list.length = 0;
    calls.threadPages.length = 0;
    calls.commentPages.length = 0;
    vi.restoreAllMocks();
  });

  const threadPage = (ids: string[], startCursor: string | null): string =>
    JSON.stringify({
      data: {
        repository: {
          pullRequest: {
            reviewThreads: {
              pageInfo: { hasPreviousPage: startCursor !== null, startCursor },
              nodes: ids.map((id) => thread({ id })),
            },
          },
        },
      },
    });

  const codexComment = { user: { login: "chatgpt-codex-connector[bot]" }, body: "Codex Review" };
  const commentPage = (count: number): string =>
    `HTTP/2.0 200 OK\n\n${JSON.stringify(Array.from({ length: count }, () => codexComment))}`;

  function listOutput(): { code: number; out: string } {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const code = run(["list", "12"]);
    return { code, out: lines.join("\n") };
  }

  it("reads every page of threads and of comments and counts them all", () => {
    calls.threadPages.push(threadPage(["new"], "c1"), threadPage(["old"], null));
    calls.commentPages.push(commentPage(100), commentPage(1));
    const { code, out } = listOutput();
    expect(code).toBe(0);
    expect(out).toContain("Unresolved threads: 2");
    expect(out.indexOf("- old")).toBeLessThan(out.indexOf("- new"));
    expect(out).toContain("Codex review comments: 101");
    expect(out).not.toContain("Incomplete");
    const threadCalls = calls.list.filter((call) => call.some((a) => a.includes("reviewThreads(")));
    expect(threadCalls[1]).toContain("before=c1");
    const commentCalls = calls.list.filter((call) => call[2] === "-i").map((call) => call[3]);
    expect(commentCalls).toEqual([
      "repos/aganesy/QFAI/issues/12/comments?per_page=100&page=1",
      "repos/aganesy/QFAI/issues/12/comments?per_page=100&page=2",
    ]);
  });

  it("says the count is incomplete when a later page of comments cannot be read", () => {
    calls.threadPages.push(threadPage([], null));
    calls.commentPages.push(commentPage(100));
    const { code, out } = listOutput();
    expect(code).toBe(2);
    expect(out).toContain("Codex review comments: 100");
    expect(out).toContain("Incomplete: not every page of comments was read");
  });

  it.each([
    ["an object", JSON.stringify({ message: "x" })],
    ["not JSON", "<html>Bad gateway</html>"],
  ])("returns 2 and says the count is incomplete when a page of comments is %s", (_, body) => {
    calls.threadPages.push(threadPage([], null));
    calls.commentPages.push(`HTTP/2.0 200 OK\n\n${body}`);
    const { code, out } = listOutput();
    expect(code).toBe(2);
    expect(out).toContain("Codex review comments: 0");
    expect(out).toContain("Incomplete: not every page of comments was read");
  });

  it("stops after a full page when the budget falls below the reserve, and says so", () => {
    calls.threadPages.push(threadPage([], null));
    const lowBudget = [
      "X-Ratelimit-Limit: 5000",
      "X-Ratelimit-Remaining: 499",
      "X-Ratelimit-Reset: 4102444800",
      "X-Ratelimit-Resource: core",
    ].join("\r\n");
    const fullPage = JSON.stringify(Array.from({ length: 100 }, () => codexComment));
    calls.commentPages.push(`HTTP/2.0 200 OK\n${lowBudget}\r\n\r\n${fullPage}`, commentPage(1));
    const { code, out } = listOutput();
    expect(code).toBe(1);
    expect(out).toContain("Codex review comments: 100");
    expect(out).toContain("Incomplete: not every page of comments was read");
    expect(calls.list.filter((call) => call[2] === "-i")).toHaveLength(1);
  });
});

describe("a call to gh that fails", () => {
  afterEach(() => {
    calls.list.length = 0;
    calls.failGh = undefined;
    calls.malformedGh = "";
    vi.restoreAllMocks();
  });

  const exited = (): Error =>
    Object.assign(new Error("Command failed: gh api graphql"), {
      status: 1,
      stderr: "HTTP 502: Bad Gateway\n",
    });

  function errorOutput(argv: string[]): { code: number; text: string; printed: boolean } {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const code = run(argv);
    return { code, text: error.mock.calls.join(" "), printed: log.mock.calls.length > 0 };
  }

  it("returns 2 and names the operation when gh exits with an error", () => {
    calls.failGh = exited;
    const { code, text } = errorOutput(["resolve", "T1"]);
    expect(code).toBe(2);
    expect(text).toContain("`gh` exited with status 1 while resolving review thread T1.");
  });

  it("returns 2 and says gh could not be started when it is not installed", () => {
    calls.failGh = (): Error => Object.assign(new Error("spawnSync gh ENOENT"), { code: "ENOENT" });
    const { code, text } = errorOutput(["list", "12"]);
    expect(code).toBe(2);
    expect(text).toContain(
      "`gh` could not be started (ENOENT) while reading the review threads of pull request 12.",
    );
  });

  it.each([
    [["list", "12"], "reviewThreads(", "reading the review threads of pull request 12"],
    [
      ["reply", "T1", "reply.txt"],
      "addPullRequestReviewThreadReply",
      "replying to review thread T1",
    ],
    [["resolve", "T1"], "resolveReviewThread", "resolving review thread T1"],
    [["defer", "12", "T1", "40"], "node(id:$id)", "reading review thread T1"],
  ])("rejects malformed JSON in %j", (argv, match, operation) => {
    calls.malformedGh = match;
    const { code, text, printed } = errorOutput(argv);
    expect(code).toBe(2);
    expect(text).toBe(`GitHub returned invalid JSON while ${operation}.`);
    expect(printed).toBe(false);
  });

  const openDeferralThreadAnswer = JSON.stringify({
    data: {
      node: {
        id: "T1",
        isResolved: false,
        path: "src/a.ts",
        line: 7,
        pullRequest: { number: 12, repository: { nameWithOwner: "aganesy/QFAI" } },
        comments: {
          nodes: [{ url: "https://x/c/1", author: { login: "reviewer" }, body: "Cover it." }],
        },
        latest: { nodes: [] },
      },
    },
  });

  it("stops deferral before writes when a follow-up comment line is malformed", () => {
    calls.threadAnswer = openDeferralThreadAnswer;
    calls.issueAnswer = `${JSON.stringify("A valid older comment.")}\n{`;

    const { code, text } = errorOutput(["defer", "12", "T1", "40"]);
    expect(code).toBe(2);
    expect(text).toBe("GitHub returned invalid JSON while reading the comments of issue 40.");
    expect(calls.list.filter(([command]) => command === "gh")).toHaveLength(2);
  });

  const recordIssueComment = "repos/aganesy/QFAI/issues/40/comments -f body=";
  const replyToThread = "addPullRequestReviewThreadReply";
  const resolveThread = "resolveReviewThread";

  it.each([
    {
      operation: "recording the finding of review thread T1 in issue 40",
      malformedArgument: "<!-- qfai-deferred-thread:T1 -->",
      attemptedWrites: [recordIssueComment],
    },
    {
      operation: "replying to review thread T1",
      malformedArgument: replyToThread,
      attemptedWrites: [recordIssueComment, replyToThread],
    },
    {
      operation: "resolving review thread T1",
      malformedArgument: resolveThread,
      attemptedWrites: [recordIssueComment, replyToThread, resolveThread],
    },
  ])("stops deferral after invalid JSON while $operation", (testCase) => {
    calls.threadAnswer = openDeferralThreadAnswer;
    calls.issueAnswer = "";
    calls.malformedGh = testCase.malformedArgument;

    const { code, text, printed } = errorOutput(["defer", "12", "T1", "40"]);

    expect(code).toBe(2);
    expect(text).toBe(`GitHub returned invalid JSON while ${testCase.operation}.`);
    expect(printed).toBe(false);
    expect(deferralWrites()).toEqual(
      testCase.attemptedWrites.map((write) => expect.stringContaining(write)),
    );
  });

  it("names the step of a deferral that failed", () => {
    calls.threadAnswer = openDeferralThreadAnswer;
    calls.issueAnswer = "";
    calls.failGh = (args): Error | undefined =>
      args.some((arg) => arg.includes("addPullRequestReviewThreadReply")) ? exited() : undefined;
    const { code, text } = errorOutput(["defer", "12", "T1", "40"]);
    expect(code).toBe(2);
    expect(text).toContain("`gh` exited with status 1 while replying to review thread T1.");
    const ghCalls = calls.list.filter(([command]) => command === "gh");
    expect(ghCalls.some((call) => call.join(" ").includes("resolveReviewThread"))).toBe(false);
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
