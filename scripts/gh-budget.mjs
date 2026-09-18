/**
 * The two GitHub questions an agent asks while waiting on CI, asked once each.
 *
 * Both are answerable several ways, and the expensive ways are the ones an agent
 * reaches for. `gh pr checks` and `gh pr view --json` go through GraphQL, where a
 * single query spends an unknown number of points; asked per pull request they
 * cost as many queries as there are branches. A job log downloaded again for
 * every `grep` costs a call per search. The allowance those spend belongs to the
 * account, not to the session, so one agent's habits reach every other session
 * and sub-agent running at the same time.
 *
 * So this exists to make the cheap path the default:
 *
 * - `runs` reports the state of every recent branch from one REST call.
 * - `log` saves a job log once and prints where it is, so the second request
 *   reads the file and calls nothing.
 *
 * ## The budget is in the response, not in `rate_limit`
 *
 * `gh api rate_limit` answered `used: 0` of 5000 on a token that a real endpoint
 * reported as 3470 of 5000 used, minutes apart. An agent that checks
 * `rate_limit` therefore reads reassurance and keeps spending. Every response to
 * a real endpoint carries `X-Ratelimit-Remaining`, `X-Ratelimit-Reset` and
 * `X-Ratelimit-Resource`, which is the instrument this reads — and reports on
 * every invocation, so the caller never has to ask separately.
 *
 * ## The reserve
 *
 * `RESERVE` is 500 of the 5000 calls the REST allowance holds per hour, a tenth
 * of it. It is not a budget to spend down to: it is what a session still has
 * after this command has refused to call. Sessions sharing one account cannot
 * see each other's spending, so a reserve smaller than one session's remaining
 * work is crossed by whichever session looks last. Finishing a pull request —
 * read the checks, read the reviews, merge — costs a handful of calls, so a
 * hundred calls per session is a wide margin across five of them, and 500 is
 * small enough that ordinary work never meets it.
 *
 * The reading each call returns is saved, so the next invocation knows the
 * remaining budget before it spends anything. A reading from a window that has
 * already reset is discarded rather than trusted.
 *
 * Usage:
 *   node scripts/gh-budget.mjs runs [branch]
 *   node scripts/gh-budget.mjs log <job-id>
 *
 * Exit codes: 0 answered, 1 the remaining budget is below the reserve, 2 the
 * arguments, `git` or `gh` could not be read.
 */
/* global console, process */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readBoundedText } from "./lib/bounded-read.mjs";

/** Calls left below which this refuses to make another. See the header. */
export const RESERVE = 500;

/** How many recent runs one call reports. Enough to cover every live branch. */
const RUNS_PER_PAGE = 30;

/** The repository root, from this file rather than from the caller's directory. */
const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");

/**
 * Where a saved log and the last reading go.
 *
 * `tmp/` at the repository root, which `.agents/rules/temporary-files.md`
 * reserves for exactly this and `.gitignore` already excludes.
 */
export const CACHE_DIR = path.join(ROOT, "tmp", "gh-budget");

/** The saved reading. Small by construction, so a bounded read is enough. */
const READING_PATH = path.join(CACHE_DIR, "last-reading.json");

/** A job log can run to megabytes, so the child's buffer has to hold one. */
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;

/**
 * The `owner/repo` an `origin` URL names, or `undefined`.
 *
 * Both forms GitHub hands out: `https://github.com/owner/repo.git` and
 * `git@github.com:owner/repo`.
 */
export function repoSlug(remoteUrl) {
  const match = /github\.com[/:]([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(remoteUrl.trim());
  return match === null ? undefined : `${match[1]}/${match[2]}`;
}

/**
 * The header block and the body of a `gh api -i` response.
 *
 * The status line ends in a bare newline and the headers after it in CRLF, so
 * the block ends at the first `\r\n\r\n`. The second separator is the fallback
 * for a response that uses bare newlines throughout.
 */
export function splitResponse(text) {
  for (const separator of ["\r\n\r\n", "\n\n"]) {
    const end = text.indexOf(separator);
    if (end >= 0) return { head: text.slice(0, end), body: text.slice(end + separator.length) };
  }
  return { head: text, body: "" };
}

/** The response's status code, or `undefined` when the status line is missing. */
export function statusCode(head) {
  const match = /^HTTP\/[\d.]+ (\d{3})/.exec(head);
  return match === null ? undefined : Number(match[1]);
}

/**
 * The rate-limit reading a header block carries, or `undefined`.
 *
 * Names are compared lowercased: the wire spells them `X-Ratelimit-Remaining`
 * and nothing obliges it to keep doing so.
 */
export function readingFrom(head) {
  const values = new Map();
  for (const line of head.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon > 0)
      values.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  const remaining = Number(values.get("x-ratelimit-remaining"));
  const limit = Number(values.get("x-ratelimit-limit"));
  const reset = Number(values.get("x-ratelimit-reset"));
  if (!Number.isInteger(remaining) || !Number.isInteger(reset)) return undefined;
  return {
    remaining,
    limit: Number.isInteger(limit) ? limit : 0,
    reset,
    resource: values.get("x-ratelimit-resource") ?? "unknown",
  };
}

/** How a reading reads on one line. */
export function describeReading(reading) {
  const resets = new Date(reading.reset * 1000).toISOString().slice(11, 16);
  return `REST calls left: ${String(reading.remaining)} of ${String(reading.limit)} (${reading.resource}), resets ${resets} UTC`;
}

/**
 * The last saved reading, or `undefined` when there is none this still applies.
 *
 * A reading from a window that has already reset says nothing about the current
 * one, where the allowance is whole again.
 */
export function lastReading(now = Date.now()) {
  const text = readBoundedText(READING_PATH, 4096);
  if (text === undefined) return undefined;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  const reading = readingOf(parsed);
  if (reading === undefined || reading.reset * 1000 <= now) return undefined;
  return reading;
}

/** A parsed value as a reading, or `undefined` when it is not one. */
function readingOf(value) {
  if (typeof value !== "object" || value === null) return undefined;
  const { remaining, limit, reset, resource } = value;
  if (!Number.isInteger(remaining) || !Number.isInteger(reset)) return undefined;
  return {
    remaining,
    limit: Number.isInteger(limit) ? limit : 0,
    reset,
    resource: typeof resource === "string" ? resource : "unknown",
  };
}

function saveReading(reading) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(READING_PATH, `${JSON.stringify(reading)}\n`, "utf-8");
}

/**
 * One row per branch, over the runs that share that branch's newest head.
 *
 * A branch usually has several workflows on one commit, and a caller asking
 * whether the branch is green needs them as one answer: a row per workflow hides
 * the red one among the green ones. Runs for an older head are dropped, because
 * a result for a commit the branch has moved past answers nothing.
 */
export function branchRows(runs) {
  const heads = new Map();
  for (const run of runs) {
    if (typeof run !== "object" || run === null) continue;
    const { head_branch: branch, head_sha: sha } = run;
    if (typeof branch !== "string" || typeof sha !== "string") continue;
    const head = heads.get(branch);
    if (head === undefined) heads.set(branch, { sha, runs: [run] });
    else if (head.sha === sha) head.runs.push(run);
  }
  return [...heads].map(([branch, head]) => ({
    branch,
    head: head.sha.slice(0, 7),
    state: head.runs.every((run) => run.status === "completed") ? "done" : "running",
    result: resultOf(head.runs),
  }));
}

/**
 * The one result a branch's runs add up to.
 *
 * The first conclusion that is not a success, because that is the one the caller
 * has to act on. `-` while any run has none yet.
 */
function resultOf(runs) {
  const unfinished = runs.some((run) => typeof run.conclusion !== "string");
  const failed = runs.find(
    (run) => typeof run.conclusion === "string" && run.conclusion !== "success",
  );
  if (failed !== undefined) return failed.conclusion;
  return unfinished ? "-" : "success";
}

/** The rows as aligned columns, header included. */
export function formatRows(rows) {
  const table = [
    ["branch", "head", "state", "result"],
    ...rows.map((row) => [row.branch, row.head, row.state, row.result]),
  ];
  const widths = table[0].map((_, column) =>
    Math.max(...table.map((row) => String(row[column]).length)),
  );
  return table
    .map((row) =>
      row
        .map((cell, column) => String(cell).padEnd(widths[column]))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

/** `git`'s answer for one argument list, or `undefined` when it has none. */
function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

/**
 * The response text for one REST path, or an error to report.
 *
 * `-i` is what makes the reading available: without the headers there is no way
 * to know the budget except by asking for it, which is the call this saves.
 */
function ghApi(apiPath) {
  try {
    return {
      text: execFileSync("gh", ["api", "-i", apiPath], {
        encoding: "utf-8",
        maxBuffer: MAX_RESPONSE_BYTES,
      }),
    };
  } catch (cause) {
    const stdout = typeof cause?.stdout === "string" ? cause.stdout : "";
    if (stdout !== "") return { text: stdout };
    return {
      error: cause?.code === "ENOENT" ? "gh is not on PATH" : String(cause?.message ?? cause),
    };
  }
}

/**
 * The reading the caller is left with, and whether it is above the reserve.
 *
 * Reported on stdout beside the answer rather than on demand, so no invocation
 * leaves the caller guessing.
 */
function reportBudget(reading) {
  console.log(describeReading(reading));
  if (reading.remaining >= RESERVE) return 0;
  console.error(
    `Below the reserve of ${String(RESERVE)} calls. Ask git for what git can answer, and wait for the reset before calling again.`,
  );
  return 1;
}

/** Whether a call may be made, judged on the last reading alone. */
function refusesToCall() {
  const reading = lastReading();
  if (reading === undefined || reading.remaining >= RESERVE) return false;
  console.error(describeReading(reading));
  console.error(
    `Below the reserve of ${String(RESERVE)} calls, so no call was made. Wait for the reset.`,
  );
  return true;
}

/** One REST call, with the reading saved and reported. Returns the exit code. */
function callAndReport(apiPath, handleBody) {
  if (refusesToCall()) return 1;
  const response = ghApi(apiPath);
  if (response.text === undefined) {
    console.error(response.error);
    return 2;
  }
  const { head, body } = splitResponse(response.text);
  const reading = readingFrom(head);
  if (reading !== undefined) saveReading(reading);

  const code = statusCode(head);
  if (code !== 200) {
    console.error(`GitHub answered ${String(code ?? "nothing")} for ${apiPath}.`);
    if (reading !== undefined) reportBudget(reading);
    return 2;
  }
  const handled = handleBody(body);
  if (handled !== 0) return handled;
  return reading === undefined ? 0 : reportBudget(reading);
}

/** `runs [branch]`: the state of every recent branch, or of one, from one call. */
function runsCommand(slug, branch) {
  return callAndReport(`repos/${slug}/actions/runs?per_page=${String(RUNS_PER_PAGE)}`, (body) => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      console.error("The response body is not JSON.");
      return 2;
    }
    const runs = Array.isArray(parsed?.workflow_runs) ? parsed.workflow_runs : [];
    const rows = branchRows(runs).filter((row) => branch === undefined || row.branch === branch);
    console.log(
      rows.length === 0 ? "No run for that branch among the most recent." : formatRows(rows),
    );
    return 0;
  });
}

/** `log <job-id>`: the saved log's path, downloading it only the first time. */
function logCommand(slug, jobId) {
  const target = path.join(CACHE_DIR, `job-${jobId}.log`);
  if (saved(target)) {
    console.log(target);
    console.log("Already saved, so no call was made.");
    return 0;
  }
  return callAndReport(`repos/${slug}/actions/jobs/${jobId}/logs`, (body) => {
    if (body.trim() === "") {
      console.error("GitHub returned an empty log body; nothing was saved.");
      return 2;
    }
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(target, body, "utf-8");
    console.log(target);
    return 0;
  });
}

/** Whether a log is already on disk with content in it. */
function saved(target) {
  try {
    return statSync(target).size > 0;
  } catch {
    return false;
  }
}

const USAGE = [
  "Usage:",
  "  node scripts/gh-budget.mjs runs [branch]",
  "  node scripts/gh-budget.mjs log <job-id>",
].join("\n");

export function run(argv) {
  const [command, argument] = argv;
  if (command !== "runs" && command !== "log") {
    console.error(USAGE);
    return 2;
  }
  if (command === "log" && !/^\d+$/.test(argument ?? "")) {
    console.error("A job id is a number. Take one from the run's jobs list.");
    return 2;
  }

  const remote = git(["remote", "get-url", "origin"]);
  const slug = remote === undefined ? undefined : repoSlug(remote);
  if (slug === undefined) {
    console.error("The `origin` remote does not name a GitHub repository.");
    return 2;
  }

  return command === "runs" ? runsCommand(slug, argument) : logCommand(slug, argument);
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals. The command then never runs and exits 0 having
// answered nothing.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)));
}
