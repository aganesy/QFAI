/* global console, process */
/**
 * Derive the `e2e` project's `it` / `test` callsite count from the tree.
 *
 * `.qfai/evidence/atdd-spec-0017.md` records the count on the line
 * `e2e callsites at this tree: N (<root> N, …)`, and a commit that changes a
 * callsite under the `e2e` project's include globs owes a re-measurement.
 * Nothing shipped the measurement, so every contributor who reddened
 * `stageEvidenceCounts.test.ts` had to re-implement this walk from the guard's
 * prose — read the workspace includes, turn them into roots, walk the
 * `*.test.ts` files, count the matching lines. Eight agents have done exactly
 * that, independently, in one sweep.
 *
 * The per-root split sits on that same line, and is written and checked with
 * the total. It is on the line rather than in the prose beside it because prose
 * is not re-pinned: a split nothing derives goes stale at the next re-pin and
 * stays stale until a reader happens to check it. This one comes back from the
 * same walk as the total, so it costs nothing to write and reddens with it.
 *
 * The split also sees what the total cannot. A callsite moving between two
 * roots leaves the total alone, and only a root-by-root comparison notices.
 *
 * So the derivation lives here once, and has two consumers:
 *
 *   - `tests/assets/stageEvidenceCounts.test.ts` compares the recorded line
 *     with what this returns;
 *   - `scripts/pin-stage-evidence-counts.mjs` writes what this returns into
 *     the record.
 *
 * Sharing it is the point rather than a convenience: two implementations of
 * one rule can disagree, and then the guard is measuring the re-pin tool
 * instead of the tree. What the guard checks is the COMMITTED LITERAL against
 * the tree; the derivation is the same on both sides by construction.
 *
 * The globs are read from `vitest.workspace.ts`, not hardcoded, because a
 * guard over "the e2e project's callsites" that names the directories itself
 * is one `include` away from measuring something else. An include this cannot
 * turn into a root is REPORTED, never dropped: a walk that silently narrows
 * measures less than the project runs, which is worse than one that is absent.
 */
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

/** scripts/<this file> -> repo root */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WORKSPACE_REL = "packages/qfai/vitest.workspace.ts";
const RECORD_REL = ".qfai/evidence/atdd-spec-0017.md";
// The split is on ONE line. `[^()]` alone matches a newline, and with `m`
// the closing `$` then lands on a later line — so a record whose line had
// been broken in two would read as a whole measurement.
const RECORD_LINE = /^e2e callsites at this tree: (\d+) \(([^()\r\n]+)\)$/m;
/** One `<root> <count>` pair out of the parenthesised split. */
const BREAKDOWN_ENTRY = /^(\S+) (\d+)$/;

/**
 * A line that opens a test case. `it.each` / `test.skip` and friends count:
 * they are callsites, and the record's rule says callsites.
 */
const CALLSITE_LINE = /^[ \t]*(?:it|test)(?:\.\w+)*\s*\(/;

export { RECORD_REL, RECORD_LINE, WORKSPACE_REL };

/**
 * The `e2e` project's own include list, found by project NAME.
 *
 * Matching `tests/…` anywhere in the workspace file measured the whole tests
 * tree instead — 4562 callsites against 880 — so the block is located by the
 * name the record's rule names.
 */
export async function e2eIncludeRoots() {
  const workspace = await readFile(path.join(REPO_ROOT, WORKSPACE_REL), "utf-8");
  const project = /name:\s*"e2e",\s*include:\s*\[([^\]]*)\]/.exec(workspace);
  if (project === null) {
    throw new Error(
      `${WORKSPACE_REL}: no \`e2e\` project with an include list. The callsite derivation reads ` +
        "the globs from there rather than naming the directories itself.",
    );
  }
  const declared = [...project[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const roots = [];
  const unparsed = [];
  for (const include of declared) {
    const root = /^(tests\/[^"*]+)\/\*/.exec(include)?.[1];
    if (root === undefined) unparsed.push(include);
    else roots.push(root);
  }
  if (unparsed.length > 0) {
    throw new Error(
      `${WORKSPACE_REL}: the \`e2e\` project declares an include this walk cannot turn into a ` +
        `root: ${JSON.stringify(unparsed)}. Extend the pattern rather than letting the walk ` +
        "measure less than the project runs.",
    );
  }
  if (roots.length === 0) {
    throw new Error(`${WORKSPACE_REL}: the \`e2e\` project declares no includes.`);
  }
  return [...new Set(roots)].map((glob) => `packages/qfai/${glob}`).sort();
}

/** Callsites under one root, recursively. */
async function countUnder(absRoot) {
  let total = 0;
  for (const entry of await readdir(absRoot, { withFileTypes: true })) {
    const full = path.join(absRoot, entry.name);
    if (entry.isDirectory()) {
      total += await countUnder(full);
      continue;
    }
    if (!/\.test\.ts$/.test(entry.name)) continue;
    const text = await readFile(full, "utf8");
    total += text.split(/\r?\n/).filter((line) => CALLSITE_LINE.test(line)).length;
  }
  return total;
}

/**
 * `{ total, perRoot }` for the current tree.
 *
 * `perRoot` is what the record's line carries beside the total, and what a
 * reviewer checks the total against rather than taking a bare integer on trust.
 */
export async function deriveE2eCallsites() {
  const roots = await e2eIncludeRoots();
  const perRoot = {};
  let total = 0;
  for (const root of roots) {
    const count = await countUnder(path.join(REPO_ROOT, root));
    perRoot[root] = count;
    total += count;
  }
  return { total, perRoot, roots };
}

/**
 * `{ total, perRoot }` for the tree at one git revision, or `null` where the
 * revision cannot be read.
 *
 * The same walk as {@link deriveE2eCallsites}, over `git` rather than the
 * filesystem, and — deliberately — over the same {@link CALLSITE_LINE}. A
 * second spelling of "what counts as a callsite" is what would make the two
 * measurements incomparable, which is the one thing this answer cannot afford:
 * it is subtracted from the working tree's count, so an off-by-one in either
 * walk reads as a change the branch made.
 *
 * `null` rather than a throw. The caller uses this to tell a branch's own drift
 * from the base's, and where git cannot answer there is no such distinction to
 * draw — a shallow clone with no merge base is a tree, not a fault.
 */
export async function deriveE2eCallsitesAt(rev) {
  const roots = await e2eIncludeRoots();
  const perRoot = {};
  let total = 0;
  for (const root of roots) {
    let listing;
    try {
      const { stdout } = await run("git", ["ls-tree", "-r", "--name-only", "-z", rev, "--", root], {
        cwd: REPO_ROOT,
        maxBuffer: 64 * 1024 * 1024,
      });
      listing = stdout;
    } catch {
      return null;
    }
    const files = listing.split("\0").filter((name) => /\.test\.ts$/.test(name));
    let count = 0;
    for (const file of files) {
      let text;
      try {
        const { stdout } = await run("git", ["show", `${rev}:${file}`], {
          cwd: REPO_ROOT,
          maxBuffer: 64 * 1024 * 1024,
        });
        text = stdout;
      } catch {
        return null;
      }
      count += text.split(/\r?\n/).filter((line) => CALLSITE_LINE.test(line)).length;
    }
    perRoot[root] = count;
    total += count;
  }
  return { total, perRoot, roots };
}

/**
 * The revisions this tree's count may be measured against to find **this
 * branch's** own change, best answer first.
 *
 * Two of them, because the two places this runs know different things.
 *
 * | where                     | what is available                  | which answer |
 * | ------------------------- | ---------------------------------- | ------------ |
 * | a clone with the default branch | `origin/main`                | the fork point |
 * | a pull-request checkout   | one merge commit, no other ref     | its first parent |
 *
 * The fork point comes first because it is right in both shapes. The first
 * parent is right only where `HEAD` is the merge a pull-request checkout
 * produces: after a local `git merge` of the default branch it is the branch's
 * own previous commit, and the base's callsites would then read as the
 * branch's.
 */
async function baseRevisionCandidates() {
  let head = "";
  const candidates = [];
  try {
    const { stdout } = await run("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT });
    head = stdout.trim();
  } catch {
    // Not a repository, or no commits. Nothing below can be asked either.
    return candidates;
  }
  try {
    const { stdout } = await run("git", ["merge-base", "origin/main", "HEAD"], { cwd: REPO_ROOT });
    if (stdout.trim() !== "") candidates.push(stdout.trim());
  } catch {
    // No `origin/main`: a shallow checkout fetches one ref. The next candidate
    // is the one that shape does answer.
  }
  try {
    const { stdout } = await run("git", ["rev-list", "--parents", "-n", "1", "HEAD"], {
      cwd: REPO_ROOT,
    });
    // `<commit> <parent…>`, so three or more fields is a merge. A shallow
    // checkout grafts `HEAD` to no parents at all, which is why the depth the
    // workflow asks for is two rather than the default one.
    const parents = stdout.trim().split(/\s+/);
    if (parents.length >= 3 && parents[1] !== undefined) candidates.push(parents[1]);
  } catch {
    // A commit with no history to walk.
  }
  // `HEAD` is never its own base. On the default branch the merge base with
  // `origin/main` is `HEAD` itself, and measuring the tree against itself would
  // make every drift read as inherited — the check answering yes to a question
  // it was not asked.
  return candidates.filter((rev) => rev !== head);
}

/**
 * `{ total, perRoot }` for the tree this branch was built on, or `null` where
 * git cannot answer.
 *
 * A candidate is used only if it can actually be measured. Naming a revision
 * and reading it are separate questions in a shallow clone: the parent SHAs are
 * written in the merge commit, while the objects they point at may never have
 * been fetched. Asking for the measurement is the only check that settles both,
 * so that is what this does — in order, first answer wins.
 */
export async function deriveE2eCallsitesAtBase() {
  for (const rev of await baseRevisionCandidates()) {
    const measured = await deriveE2eCallsitesAt(rev);
    if (measured !== null) return measured;
  }
  return null;
}

/**
 * The record's line for a measurement.
 *
 * Both consumers go through this rather than each spelling the line out: the
 * one that writes it and the one that reads it back have to agree on the shape,
 * and a second spelling is a second thing to keep in step.
 */
export function formatRecordLine({ total, perRoot }) {
  const split = Object.entries(perRoot)
    .map(([root, count]) => `${root} ${String(count)}`)
    .join(", ");
  return `e2e callsites at this tree: ${String(total)} (${split})`;
}

/**
 * `{ total, perRoot }` out of a record's text, or `null` when the line is
 * absent or malformed.
 *
 * A malformed line reads as absent on purpose. Both answers send the reader to
 * the same place — run the re-pin tool — and a partial parse would let half a
 * line stand as a measurement.
 */
export function parseRecordLine(record) {
  const stated = RECORD_LINE.exec(record);
  if (stated === null) return null;
  // A null-prototype map, so a root named `constructor` or `__proto__` is a key
  // like any other rather than a collision with `Object.prototype`.
  const perRoot = Object.create(null);
  for (const entry of stated[2].split(", ")) {
    const pair = BREAKDOWN_ENTRY.exec(entry);
    if (pair === null) return null;
    // A root stated twice states two counts for it. Assigning the second over
    // the first would accept a line nobody can read as one measurement, which
    // is what this function refuses to do everywhere else.
    if (pair[1] in perRoot) return null;
    perRoot[pair[1]] = Number(pair[2]);
  }
  return { total: Number(stated[1]), perRoot };
}

/** What the record on disk states, through `parseRecordLine`. */
export async function recordedE2eCallsites() {
  return parseRecordLine(await readFile(path.join(REPO_ROOT, RECORD_REL), "utf-8"));
}

// Run directly for a quick read, so a contributor can see the number without
// reading this file.
if (process.argv[1] !== undefined && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const measured = await deriveE2eCallsites();
  const recorded = await recordedE2eCallsites();
  for (const [root, count] of Object.entries(measured.perRoot)) {
    console.log(`${String(count).padStart(6)}  ${root}`);
  }
  console.log(`${String(measured.total).padStart(6)}  total`);
  console.log(`        recorded in ${RECORD_REL}:`);
  console.log(`        ${recorded === null ? "(no line)" : formatRecordLine(recorded)}`);
  process.exit(
    recorded !== null && formatRecordLine(recorded) === formatRecordLine(measured) ? 0 : 1,
  );
}
