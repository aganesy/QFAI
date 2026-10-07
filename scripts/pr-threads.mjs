/**
 * The review state of one pull request, read and answered through one call each.
 *
 * Review threads exist only in GraphQL, so this is where that surface is spent,
 * and it is spent once per command: `list` is one GraphQL query for the threads
 * and one REST call for the pull request's comments, never a query per thread.
 * The REST call goes through `gh-budget.mjs`, so it keeps that command's reserve
 * and reports the remaining budget.
 *
 * - `list` prints each unresolved thread and each comment that carries a Codex
 *   review, which arrives as a comment with no thread.
 * - `reply` answers one thread with the text of a file.
 * - `resolve` resolves the threads it is given.
 * - `defer` records one thread's finding in a follow-up issue, replies to the
 *   thread with that issue's number and resolves it, in that order, so a
 *   resolved thread always has its finding in the issue.
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
 * arguments, `git` or `gh` could not be read.
 */
/* global console, process */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { callAndReport, repoSlug } from "./gh-budget.mjs";

/** How many characters of a comment one line of output shows. */
const EXCERPT_LENGTH = 600;

/** The login the Codex review bot comments under. */
const CODEX_LOGIN = "chatgpt-codex-connector[bot]";

// SIMPLIFIED: reads the newest 100 threads of a pull request and the first 100
// of its comments.
// Lift when: a pull request carries more than that and the missing ones matter.
const PAGE_SIZE = 100;

const THREADS_QUERY = `query($owner:String!,$repo:String!,$number:Int!,$size:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      reviewThreads(last:$size){
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

const THREAD_QUERY = `query($id:ID!){
  node(id:$id){
    ... on PullRequestReviewThread {
      path line
      comments(first:1){ nodes{ url author{login} body } }
    }
  }
}`;

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
  if (typeof first?.body !== "string") return undefined;
  const path = typeof thread.path === "string" ? thread.path : "?";
  const where = Number.isInteger(thread.line) ? `${path}:${String(thread.line)}` : path;
  const author = typeof first.author?.login === "string" ? first.author.login : "unknown";
  return [
    `Deferred from pull request ${pr}: ${where}, by @${author}.`,
    `Thread: ${String(first.url ?? "")}`,
    "",
    first.body.trim(),
  ].join("\n");
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 });
}

function origin() {
  try {
    return repoSlug(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf-8" }));
  } catch {
    return undefined;
  }
}

function listCommand(slug, number) {
  const [owner, repo] = slug.split("/");
  const response = JSON.parse(
    gh([
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
    ]),
  );
  const threads = unresolvedThreads(response);
  if (threads === undefined) {
    console.error("GitHub's answer holds no review threads for that pull request.");
    return 2;
  }
  console.log(`Unresolved threads: ${String(threads.length)}`);
  for (const thread of threads) console.log(`\n${formatThread(thread)}`);

  return callAndReport(
    `repos/${slug}/issues/${number}/comments?per_page=${String(PAGE_SIZE)}`,
    (body) => {
      const findings = codexFindings(JSON.parse(body));
      console.log(`\nCodex review comments: ${String(findings.length)}`);
      for (const finding of findings) console.log(`\n- ${finding.url}\n${excerpt(finding.body)}`);
      return 0;
    },
  );
}

function replyCommand(threadId, bodyFile) {
  const out = JSON.parse(
    gh([
      "api",
      "graphql",
      "-f",
      `query=${REPLY_MUTATION}`,
      "-F",
      `id=${threadId}`,
      "-F",
      `body=@${bodyFile}`,
    ]),
  );
  console.log(out?.data?.addPullRequestReviewThreadReply?.comment?.url ?? "replied");
  return 0;
}

function resolveCommand(threadIds) {
  for (const id of threadIds) {
    gh(["api", "graphql", "-f", `query=${RESOLVE_MUTATION}`, "-F", `id=${id}`]);
    console.log(`resolved ${id}`);
  }
  return 0;
}

function deferCommand(slug, pr, threadId, issue) {
  const entry = deferredEntry(
    pr,
    JSON.parse(gh(["api", "graphql", "-f", `query=${THREAD_QUERY}`, "-F", `id=${threadId}`])),
  );
  if (entry === undefined) {
    console.error("GitHub's answer holds no review thread with that id.");
    return 2;
  }
  gh(["api", `repos/${slug}/issues/${issue}/comments`, "-f", `body=${entry}`]);
  gh([
    "api",
    "graphql",
    "-f",
    `query=${REPLY_MUTATION}`,
    "-F",
    `id=${threadId}`,
    "-f",
    `body=Deferred to #${issue}.`,
  ]);
  gh(["api", "graphql", "-f", `query=${RESOLVE_MUTATION}`, "-F", `id=${threadId}`]);
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
  if (command === "list") return listCommand(slug, args[0]);
  if (command === "reply") return replyCommand(args[0], args[1]);
  if (command === "defer") return deferCommand(slug, args[0], args[1], args[2]);
  return resolveCommand(args);
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)));
}
