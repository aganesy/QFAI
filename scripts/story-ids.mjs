/**
 * Story-tree IDs that no open pull request has already taken.
 *
 * A new decision, business rule, acceptance criterion or example takes the next
 * number after the highest one in the tree. Read from the local checkout, that
 * number is the same for every branch cut from the same main, so pull requests
 * opened in parallel pick the same IDs and all but the first renumber after
 * merging main.
 *
 * - `next <scope>` prints the next number free on main, on the head of every
 *   open pull request, and in the working tree.
 * - `check` names each ID this branch adds that main or another open pull
 *   request also adds. Two branches that picked their IDs before either was
 *   pushed are still caught, while renumbering costs one edit.
 *
 * Both read the open pull requests from one REST listing and fetch their heads
 * with one `git fetch`, so the cost is one call however many are open. The call
 * goes through `gh-budget.mjs`, which reports the remaining allowance and keeps
 * its reserve.
 *
 * An ID counts wherever it is written under `.qfai/spec/`, not only where it is
 * declared: a retired ID named in a decision row is not handed out again.
 *
 * Usage:
 *   node scripts/story-ids.mjs next <scope>
 *   node scripts/story-ids.mjs check
 *
 * Scopes: `DEC`, `OQ`, `BF`, `CLI` / `API` / `DB` / `UI` (one number space),
 * `US-<flow>`, `AC-<flow>-<story>`, `EX-<flow>-<story>`, `BR-<contract>`.
 *
 * Exit codes: 0 answered, 1 a collision was found or the remaining budget is
 * below the reserve, 2 the arguments, `git` or `gh` could not be read.
 */
/* global console, process */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { callAndReport, repoSlug } from "./gh-budget.mjs";

/** The repository root, from this file rather than from the caller's directory. */
const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");

/** The directory every story-tree ID is written in. */
const SPEC_DIR = ".qfai/spec";

/** The branch pull requests merge into. */
const MAIN = "main";

// SIMPLIFIED: reads the 100 most recently updated open pull requests, one page.
// Lift when: a collision comes from an open pull request outside that page.
const PULLS_PER_PAGE = 100;

/** `git grep` output across every open head can outgrow the default buffer. */
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/** The ID grammar the story-tree validator accepts. */
const GRAMMAR = [
  /^BF-\d{4}$/,
  /^US-\d{4}-\d{4}$/,
  /^AC-\d{4}-\d{4}-\d{2}$/,
  /^EX-\d{4}-\d{4}-\d{2}$/,
  /^BR-\d{4}-\d{4}$/,
  /^DEC-\d{4}$/,
  /^OQ-\d{4}$/,
  /^(?:CLI|API|DB|UI)-\d{4}$/,
];

/**
 * An ID candidate, with the one character before it when there is one.
 *
 * The leading character keeps `CON-UI-0001` from reading as `UI-0001`.
 */
const GREP_PATTERN =
  "(^|[^A-Za-z0-9_-])(DEC|OQ|BF|US|AC|EX|BR|CLI|API|DB|UI)-[0-9]{4}(-[0-9]{2,4})*";

/** Whether a value is a story-tree ID of any kind. */
export function isStoryId(value) {
  return GRAMMAR.some((shape) => shape.test(value));
}

/** The IDs in `git grep -o` output: one match per line, maybe one leading character. */
export function idsFromMatches(output) {
  const ids = new Set();
  for (const line of output.split(/\r?\n/)) {
    const id = /^[A-Z]/.test(line) ? line : line.slice(1);
    if (isStoryId(id)) ids.add(id);
  }
  return ids;
}

/**
 * The shape of the ID a scope hands out, or `undefined` for an unknown scope.
 *
 * `siblings` matches every ID sharing the scope's number space and captures its
 * number; `format` turns a number back into an ID.
 */
export function parseScope(scope) {
  if (/^(?:DEC|OQ|BF)$/.test(scope)) {
    return {
      siblings: new RegExp(`^${scope}-(\\d{4})$`),
      width: 4,
      format: (number) => `${scope}-${number}`,
    };
  }
  if (/^(?:CLI|API|DB|UI)$/.test(scope)) {
    return {
      siblings: /^(?:CLI|API|DB|UI)-(\d{4})$/,
      width: 4,
      format: (number) => `${scope}-${number}`,
    };
  }
  const nested = /^(?:US|BR)-\d{4}$/.test(scope)
    ? 4
    : /^(?:AC|EX)-\d{4}-\d{4}$/.test(scope)
      ? 2
      : undefined;
  if (nested === undefined) return undefined;
  return {
    siblings: new RegExp(`^${scope}-(\\d{${String(nested)}})$`),
    width: nested,
    format: (number) => `${scope}-${number}`,
  };
}

/** The next ID in a scope after every ID in `taken`, or `undefined` when none is left. */
export function nextFree(shape, taken) {
  let highest = 0;
  for (const id of taken) {
    const match = shape.siblings.exec(id);
    if (match !== null) highest = Math.max(highest, Number(match[1]));
  }
  if (highest >= 10 ** shape.width - 1) return undefined;
  return shape.format(String(highest + 1).padStart(shape.width, "0"));
}

/**
 * Each ID this branch adds that another head adds too, with the heads that do.
 *
 * `others` is a list of `{ label, ids }`, where `ids` are already only the ones
 * that head adds. Sorted, so the output is stable.
 */
export function collisions(mine, others) {
  const found = [];
  for (const id of [...mine].sort()) {
    const heads = others.filter((other) => other.ids.has(id)).map((other) => other.label);
    if (heads.length > 0) found.push({ id, heads });
  }
  return found;
}

/** Everything in `ids` that `base` does not hold. */
export function added(ids, base) {
  return new Set([...ids].filter((id) => !base.has(id)));
}

/**
 * The open pull requests a listing names, as number, branch and repository.
 *
 * `undefined` when the body is not a listing.
 */
export function pullsFrom(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;
  return parsed.flatMap((pull) =>
    Number.isInteger(pull?.number) && typeof pull?.head?.ref === "string"
      ? [{ number: pull.number, branch: pull.head.ref, repo: pull.head.repo?.full_name }]
      : [],
  );
}

/**
 * The commit `git fetch` wrote for each pull request's head, from `FETCH_HEAD`.
 *
 * Read from the fetch rather than from the listing: a head pushed between the
 * two is the one that holds the IDs now.
 */
export function fetchedHeads(fetchHead) {
  const heads = new Map();
  for (const line of fetchHead.split(/\r?\n/)) {
    const match = /^([0-9a-f]{40,64})\t[^\t]*\t'refs\/pull\/(\d+)\/head'/.exec(line);
    if (match !== null) heads.set(Number(match[2]), match[1]);
  }
  return heads;
}

/** `git`'s output for one argument list; throws when git fails. */
function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf-8",
    maxBuffer: MAX_OUTPUT_BYTES,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Every ID under the spec directory of a commit, or of the working tree when
 * `commit` is undefined. Untracked files count: a new story directory is not
 * staged yet when its IDs are picked.
 */
function idsAt(commit) {
  const [option, tree] = commit === undefined ? [["--untracked"], []] : [[], [commit]];
  try {
    return idsFromMatches(
      git(["grep", ...option, "-h", "-o", "-I", "-E", GREP_PATTERN, ...tree, "--", SPEC_DIR]),
    );
  } catch (cause) {
    // `git grep` exits 1 when nothing matched, which is an answer.
    if (cause?.status === 1) return new Set();
    throw cause;
  }
}

/** Fetches main and every listed head, and returns the commit of each. */
function fetchHeads(pulls) {
  git([
    "fetch",
    "--quiet",
    "--no-tags",
    "origin",
    `+refs/heads/${MAIN}:refs/remotes/origin/${MAIN}`,
    ...pulls.map((pull) => `refs/pull/${String(pull.number)}/head`),
  ]);
  const fetchHead = readFileSync(
    path.resolve(ROOT, git(["rev-parse", "--git-path", "FETCH_HEAD"]).trim()),
    "utf-8",
  );
  return { main: `refs/remotes/origin/${MAIN}`, pulls: fetchedHeads(fetchHead) };
}

/** Whether a listed pull request is this branch's own. */
function isOwn(pull, slug, branch) {
  return pull.branch === branch && (pull.repo === undefined || pull.repo === slug);
}

function nextCommand(shape, pulls) {
  const heads = fetchHeads(pulls);
  const taken = new Set([...idsAt(heads.main), ...idsAt(undefined)]);
  for (const commit of heads.pulls.values()) for (const id of idsAt(commit)) taken.add(id);
  const id = nextFree(shape, taken);
  if (id === undefined) {
    console.error("No number is left in that scope.");
    return 2;
  }
  console.log(id);
  return 0;
}

function checkCommand(pulls, slug) {
  const heads = fetchHeads(pulls);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  const base = idsAt(git(["merge-base", "HEAD", heads.main]).trim());
  const mine = added(idsAt(undefined), base);
  const others = [{ label: MAIN, ids: added(idsAt(heads.main), base) }];
  for (const pull of pulls) {
    const commit = heads.pulls.get(pull.number);
    if (commit === undefined || isOwn(pull, slug, branch)) continue;
    others.push({
      label: `#${String(pull.number)} (${pull.branch})`,
      ids: added(idsAt(commit), base),
    });
  }
  const found = collisions(mine, others);
  if (found.length === 0) {
    console.log(`No ID this branch adds is taken elsewhere (${String(mine.size)} checked).`);
    return 0;
  }
  for (const { id, heads: where } of found)
    console.log(`${id} is also added by ${where.join(", ")}`);
  console.error("Renumber these with `node scripts/story-ids.mjs next <scope>`.");
  return 1;
}

const USAGE = [
  "Usage:",
  "  node scripts/story-ids.mjs next <scope>",
  "  node scripts/story-ids.mjs check",
  "Scopes: DEC, OQ, BF, CLI, API, DB, UI, US-<flow>, AC-<flow>-<story>, EX-<flow>-<story>, BR-<contract>",
].join("\n");

export function run(argv) {
  const [command, scope] = argv;
  const shape = command === "next" ? parseScope(scope ?? "") : undefined;
  if ((command !== "next" && command !== "check") || (command === "next" && shape === undefined)) {
    console.error(USAGE);
    return 2;
  }

  let slug;
  try {
    slug = repoSlug(git(["remote", "get-url", "origin"]));
  } catch {
    slug = undefined;
  }
  if (slug === undefined) {
    console.error("The `origin` remote does not name a GitHub repository.");
    return 2;
  }

  let pulls;
  const listed = callAndReport(
    `repos/${slug}/pulls?state=open&sort=updated&direction=desc&per_page=${String(PULLS_PER_PAGE)}`,
    (body) => {
      pulls = pullsFrom(body);
      if (pulls !== undefined) return 0;
      console.error("The response body is not a pull request listing.");
      return 2;
    },
  );
  // A listing that crossed the reserve still answers; only the calls after it
  // are refused, and nothing below calls the API again.
  if (pulls === undefined) return listed;

  try {
    return command === "next" ? nextCommand(shape, pulls) : checkCommand(pulls, slug);
  } catch (cause) {
    const stderr = typeof cause?.stderr === "string" ? cause.stderr.trim() : "";
    console.error(stderr === "" ? String(cause?.message ?? cause) : stderr);
    return 2;
  }
}

// `pathToFileURL`, not `file://` + the path: see `scriptEntryGuard.test.ts`.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)));
}
