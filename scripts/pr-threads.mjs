/**
 * The review state of one pull request, read and answered through one call each.
 *
 * Review threads exist only in GraphQL, so this is where that surface is spent,
 * and it is spent once per page: `list` is one GraphQL query per 100 threads
 * and one REST call per 100 of the pull request's comments, never a query per
 * thread. The REST calls go through `gh-budget.mjs`, so they keep that
 * command's reserve and report the remaining budget.
 *
 * - `list` prints each unresolved thread and each comment that carries a Codex
 *   review, which arrives as a comment with no thread. It reads every page, so
 *   its counts cover the whole pull request; when a call fails or the reserve
 *   stops it before the last page of comments, it says the count is incomplete.
 * - `reply` answers one thread with the text of a file.
 * - `resolve` resolves the threads it is given.
 * - `defer` records one thread's finding in a follow-up issue, replies to the
 *   thread with that issue's number and resolves it, in that order, so a
 *   resolved thread always has its finding in the issue. It first checks that
 *   the thread belongs to the pull request it was given, in the repository of
 *   `origin`, and writes nothing when it does not. It is safe to run again
 *   after it stopped part way: a step whose result is already there, found by
 *   the thread's id, is skipped, so no comment is posted twice.
 *
 * A reply takes its body from a file because a body typed into a shell argument
 * has its backticks and `$(...)` run by the shell before this sees it.
 *
 * Usage:
 *   node scripts/pr-threads.mjs list <pr>
 *   node scripts/pr-threads.mjs reply <thread-id> <body-file>
 *   node scripts/pr-threads.mjs resolve <thread-id>...
 *   node scripts/pr-threads.mjs defer <pr> <thread-id> <follow-up-issue>
 *
 * Exit codes: 0 answered, 1 the remaining budget is below the reserve, 2 the
 * arguments, `git` or `gh` could not be read, or `defer` was given a thread of
 * another pull request or repository. A `gh` that fails or cannot be started
 * gives 2 and a line naming the operation it was doing, not a stack trace.
 */
/* global console, process */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { callAndReport, repoSlug } from "./gh-budget.mjs";

/** How many characters of a comment one line of output shows. */
const EXCERPT_LENGTH = 600;

/** The login the Codex review bot comments under. */
const CODEX_LOGIN = "chatgpt-codex-connector[bot]";

/** How many threads or comments one call asks for: the most GitHub returns. */
const PAGE_SIZE = 100;

const THREADS_QUERY = `query($owner:String!,$repo:String!,$number:Int!,$size:Int!,$before:String){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      reviewThreads(last:$size,before:$before){
        pageInfo{ hasPreviousPage startCursor }
        nodes{ id isResolved isOutdated path line
          comments(first:1){ nodes{ author{login} body } } }
      }
    }
  }
}`;

const REPLY_MUTATION = `mutation($id:ID!,$body:String!){
  addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$body}){
    comment{ url }
  }
}`;

const RESOLVE_MUTATION = `mutation($id:ID!){
  resolveReviewThread(input:{threadId:$id}){ thread{ id isResolved } }
}`;

// SIMPLIFIED: a retried `defer` looks for its own reply among the newest 100
// comments of the thread.
// Lift when: a deferred thread carries more than 100 comments.
const THREAD_QUERY = `query($id:ID!){
  node(id:$id){
    ... on PullRequestReviewThread {
      id isResolved path line
      pullRequest{ number repository{ nameWithOwner } }
      comments(first:1){ nodes{ url author{login} body } }
      latest: comments(last:100){ nodes{ body } }
    }
  }
}`;

/** The hidden line that ties a follow-up issue comment to the thread it records. */
function deferredMarker(threadId) {
  return `<!-- qfai-deferred-thread:${threadId} -->`;
}

/** The reply `defer` leaves on a thread it deferred to issue `issue`. */
function deferredReply(issue) {
  return `Deferred to #${issue}.`;
}

/** The text cut to `EXCERPT_LENGTH`, with line breaks kept. */
function excerpt(text) {
  const trimmed = text.trim();
  return trimmed.length <= EXCERPT_LENGTH ? trimmed : `${trimmed.slice(0, EXCERPT_LENGTH)}...`;
}

/**
 * The unresolved threads in a GraphQL response, as plain rows.
 *
 * A response without the threads list gives `undefined`, not an empty list, so
 * a changed response shape does not read as a pull request with nothing open.
 */
export function unresolvedThreads(response) {
  const nodes = response?.data?.repository?.pullRequest?.reviewThreads?.nodes;
  if (!Array.isArray(nodes)) return undefined;
  return nodes
    .filter((thread) => thread?.isResolved === false)
    .map((thread) => {
      const first = thread.comments?.nodes?.[0];
      return {
        id: String(thread.id),
        path: typeof thread.path === "string" ? thread.path : "?",
        line: Number.isInteger(thread.line) ? thread.line : undefined,
        outdated: thread.isOutdated === true,
        author: typeof first?.author?.login === "string" ? first.author.login : "unknown",
        body: typeof first?.body === "string" ? first.body : "",
      };
    });
}

/**
 * The cursor that reads the page of threads before this one, or `undefined`
 * when this page is the first.
 */
export function previousCursor(response) {
  const info = response?.data?.repository?.pullRequest?.reviewThreads?.pageInfo;
  if (info?.hasPreviousPage !== true || typeof info.startCursor !== "string") return undefined;
  return info.startCursor;
}

/** The comments of a pull request that carry a Codex review. */
export function codexFindings(comments) {
  if (!Array.isArray(comments)) return [];
  return comments
    .filter(
      (comment) =>
        comment?.user?.login === CODEX_LOGIN &&
        typeof comment.body === "string" &&
        comment.body.includes("Codex Review"),
    )
    .map((comment) => ({ url: String(comment.html_url ?? ""), body: comment.body }));
}

/** One thread as a header line and its first comment. */
export function formatThread(thread) {
  const where = thread.line === undefined ? thread.path : `${thread.path}:${String(thread.line)}`;
  const outdated = thread.outdated ? ", outdated" : "";
  return `- ${thread.id}  ${where}  @${thread.author}${outdated}\n${excerpt(thread.body)}`;
}

/**
 * The follow-up issue comment that records one deferred finding, in full.
 *
 * A response without the thread gives `undefined`, so a thread id that names
 * something else is not recorded as an empty finding.
 */
export function deferredEntry(pr, response) {
  const thread = response?.data?.node;
  const first = thread?.comments?.nodes?.[0];
  if (typeof first?.body !== "string" || typeof thread.id !== "string") return undefined;
  const path = typeof thread.path === "string" ? thread.path : "?";
  const where = Number.isInteger(thread.line) ? `${path}:${String(thread.line)}` : path;
  const author = typeof first.author?.login === "string" ? first.author.login : "unknown";
  return [
    `Deferred from pull request ${pr}: ${where}, by @${author}.`,
    `Thread: ${String(first.url ?? "")}`,
    "",
    first.body.trim(),
    "",
    deferredMarker(thread.id),
  ].join("\n");
}

/**
 * Which steps of deferring thread `threadId` to issue `issue` are already
 * done: the issue holds a comment marked with the thread's id, the thread holds
 * the reply that names the issue, and the thread is resolved.
 *
 * Each step is read on its own, so a retry does exactly the steps still missing.
 */
export function deferralProgress(threadId, issue, response, issueBodies) {
  const thread = response?.data?.node;
  const replies = Array.isArray(thread?.latest?.nodes) ? thread.latest.nodes : [];
  const marker = deferredMarker(threadId);
  return {
    recorded: issueBodies.some((body) => body.includes(marker)),
    replied: replies.some(
      (comment) =>
        typeof comment?.body === "string" && comment.body.trim() === deferredReply(issue),
    ),
    resolved: thread?.isResolved === true,
  };
}

/**
 * Why a thread is not one of pull request `pr` in repository `slug`, or
 * `undefined` when it is.
 *
 * An answer that does not name the thread's pull request is refused too, so a
 * changed response shape never reads as a match.
 */
export function foreignThread(slug, pr, response) {
  const pullRequest = response?.data?.node?.pullRequest;
  const nameWithOwner = pullRequest?.repository?.nameWithOwner;
  if (!Number.isInteger(pullRequest?.number) || typeof nameWithOwner !== "string") {
    return "GitHub's answer does not name the pull request that thread belongs to.";
  }
  const requested = Number(pr);
  const sameRepository = nameWithOwner.toLowerCase() === slug.toLowerCase();
  if (sameRepository && pullRequest.number === requested) return undefined;
  return `The thread belongs to ${nameWithOwner}#${String(pullRequest.number)}, not ${slug}#${String(requested)}.`;
}

/** A `gh` call that failed, with the operation it was doing. */
class GhFailure extends Error {}

/** Why `gh` failed: it could not be started, it exited with an error, or Node stopped it. */
function failureCause(error) {
  const code = typeof error?.code === "string" ? error.code : undefined;
  if (code === "ENOENT" || code === "EACCES") return `could not be started (${code})`;
  if (Number.isInteger(error?.status)) return `exited with status ${String(error.status)}`;
  return code === undefined ? "failed" : `failed (${code})`;
}

/**
 * `gh`'s output, or a `GhFailure` naming `operation` when `gh` cannot be
 * started or exits with an error. `gh`'s own message has already reached
 * stderr, so the failure adds only what was being done.
 */
function gh(args, operation) {
  try {
    return execFileSync("gh", args, { encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    throw new GhFailure(`\`gh\` ${failureCause(error)} while ${operation}.`);
  }
}

function origin() {
  try {
    return repoSlug(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf-8" }));
  } catch {
    return undefined;
  }
}

/**
 * The unresolved threads of every page, oldest first, or `undefined` when an
 * answer holds no threads list.
 */
function readThreads(owner, repo, number) {
  const threads = [];
  let before;
  do {
    const args = [
      "api",
      "graphql",
      "-f",
      `query=${THREADS_QUERY}`,
      "-F",
      `owner=${owner}`,
      "-F",
      `repo=${repo}`,
      "-F",
      `number=${number}`,
      "-F",
      `size=${String(PAGE_SIZE)}`,
    ];
    if (before !== undefined) args.push("-f", `before=${before}`);
    const response = JSON.parse(gh(args, `reading the review threads of pull request ${number}`));
    const page = unresolvedThreads(response);
    if (page === undefined) return undefined;
    threads.unshift(...page);
    before = previousCursor(response);
  } while (before !== undefined);
  return threads;
}

/**
 * The comments of a pull request, page by page until a page is not full.
 *
 * `complete` is false when a call failed, or the reserve stopped the reading
 * after a full page, so the comments read may be short. `budget` is the last
 * remaining-budget line, printed once after the answer.
 */
function readComments(slug, number) {
  const comments = [];
  let budget;
  for (let page = 1; ; page += 1) {
    let read = false;
    let full = false;
    const code = callAndReport(
      `repos/${slug}/issues/${number}/comments?per_page=${String(PAGE_SIZE)}&page=${String(page)}`,
      (body) => {
        const items = JSON.parse(body);
        read = true;
        if (Array.isArray(items)) {
          comments.push(...items);
          full = items.length === PAGE_SIZE;
        }
        return 0;
      },
      (line) => {
        budget = line;
      },
    );
    if (code !== 0 || !full) return { comments, code, complete: read && !full, budget };
  }
}

function listCommand(slug, number) {
  const [owner, repo] = slug.split("/");
  const threads = readThreads(owner, repo, number);
  if (threads === undefined) {
    console.error("GitHub's answer holds no review threads for that pull request.");
    return 2;
  }
  console.log(`Unresolved threads: ${String(threads.length)}`);
  for (const thread of threads) console.log(`\n${formatThread(thread)}`);

  const { comments, code, complete, budget } = readComments(slug, number);
  const findings = codexFindings(comments);
  console.log(`\nCodex review comments: ${String(findings.length)}`);
  for (const finding of findings) console.log(`\n- ${finding.url}\n${excerpt(finding.body)}`);
  if (!complete) {
    console.log(
      "\nIncomplete: not every page of comments was read, so there may be more Codex review comments than this count.",
    );
  }
  if (budget !== undefined) console.log(budget);
  return code;
}

function replyCommand(threadId, bodyFile) {
  const out = JSON.parse(
    gh(
      [
        "api",
        "graphql",
        "-f",
        `query=${REPLY_MUTATION}`,
        "-F",
        `id=${threadId}`,
        "-F",
        `body=@${bodyFile}`,
      ],
      `replying to review thread ${threadId}`,
    ),
  );
  console.log(out?.data?.addPullRequestReviewThreadReply?.comment?.url ?? "replied");
  return 0;
}

function resolveCommand(threadIds) {
  for (const id of threadIds) {
    gh(
      ["api", "graphql", "-f", `query=${RESOLVE_MUTATION}`, "-F", `id=${id}`],
      `resolving review thread ${id}`,
    );
    console.log(`resolved ${id}`);
  }
  return 0;
}

/**
 * The bodies of every comment on issue `issue`, one JSON string per line of
 * `gh`'s output so a body's own line breaks cannot split it.
 */
function issueCommentBodies(slug, issue) {
  const out = gh(
    [
      "api",
      "--paginate",
      `repos/${slug}/issues/${issue}/comments?per_page=100`,
      "--jq",
      ".[].body | @json",
    ],
    `reading the comments of issue ${issue}`,
  );
  return out
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line))
    .filter((body) => typeof body === "string");
}

function deferCommand(slug, pr, threadId, issue) {
  const response = JSON.parse(
    gh(
      ["api", "graphql", "-f", `query=${THREAD_QUERY}`, "-F", `id=${threadId}`],
      `reading review thread ${threadId}`,
    ),
  );
  const entry = deferredEntry(pr, response);
  if (entry === undefined) {
    console.error("GitHub's answer holds no review thread with that id.");
    return 2;
  }
  const mismatch = foreignThread(slug, pr, response);
  if (mismatch !== undefined) {
    console.error(`${mismatch} Nothing was recorded, replied to or resolved.`);
    return 2;
  }
  const done = deferralProgress(threadId, issue, response, issueCommentBodies(slug, issue));
  if (done.recorded && done.replied && done.resolved) {
    console.log(`${threadId} is already deferred to #${issue}; nothing was written.`);
    return 0;
  }
  if (!done.recorded) {
    gh(
      ["api", `repos/${slug}/issues/${issue}/comments`, "-f", `body=${entry}`],
      `recording the finding of review thread ${threadId} in issue ${issue}`,
    );
  }
  if (!done.replied) {
    gh(
      [
        "api",
        "graphql",
        "-f",
        `query=${REPLY_MUTATION}`,
        "-F",
        `id=${threadId}`,
        "-f",
        `body=${deferredReply(issue)}`,
      ],
      `replying to review thread ${threadId}`,
    );
  }
  if (!done.resolved) {
    gh(
      ["api", "graphql", "-f", `query=${RESOLVE_MUTATION}`, "-F", `id=${threadId}`],
      `resolving review thread ${threadId}`,
    );
  }
  console.log(`deferred ${threadId} to #${issue}`);
  return 0;
}

const USAGE = [
  "Usage:",
  "  node scripts/pr-threads.mjs list <pr>",
  "  node scripts/pr-threads.mjs reply <thread-id> <body-file>",
  "  node scripts/pr-threads.mjs resolve <thread-id>...",
  "  node scripts/pr-threads.mjs defer <pr> <thread-id> <follow-up-issue>",
].join("\n");

export function run(argv) {
  const [command, ...args] = argv;
  const valid =
    (command === "list" && args.length === 1 && /^\d+$/.test(args[0])) ||
    (command === "reply" && args.length === 2) ||
    (command === "resolve" && args.length >= 1) ||
    (command === "defer" && args.length === 3 && /^\d+$/.test(args[0]) && /^\d+$/.test(args[2]));
  if (!valid) {
    console.error(USAGE);
    return 2;
  }

  const slug = origin();
  if (slug === undefined) {
    console.error("The `origin` remote does not name a GitHub repository.");
    return 2;
  }
  try {
    if (command === "list") return listCommand(slug, args[0]);
    if (command === "reply") return replyCommand(args[0], args[1]);
    if (command === "defer") return deferCommand(slug, args[0], args[1], args[2]);
    return resolveCommand(args);
  } catch (error) {
    if (!(error instanceof GhFailure)) throw error;
    console.error(error.message);
    return 2;
  }
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)));
}
