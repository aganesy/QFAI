#!/usr/bin/env node
/**
 * Pack-location lint lane.
 *
 * Detects `review-*` and `discussion-*` pack directories introduced
 * outside their allowed roots. The textual contributor rule lives in
 * `.agents/rules/root-additions-policy.md`; this script gives that rule
 * structural enforcement via `pnpm ci:lint`.
 *
 * Allowed roots:
 *   - review-*.qfai/review/<pack-name>/  (or tmp/<pack-name>/)
 *   - discussion-*.qfai/discussion/<pack-name>/  (or tmp/<pack-name>/)
 *
 * Scope (per the pack-location lint scope decision):
 *   The lane inspects ONLY the changed paths in scope of the current
 *   work (PR diff against base in CI, or staged + working-tree changes
 *   locally; or the explicit list passed via `--changed`). It is NOT a
 *   full working-tree walk — untouched legacy packs that pre-date the
 *   rule are deliberately not re-flagged.
 *
 * Invocation modes:
 *   - default          read four change-sources and union them:
 *                      `git diff --numstat --cached HEAD` (staged),
 *                      `git diff --numstat` (unstaged tracked),
 *                      `git status --porcelain` filtered to untracked
 *                      entries, and
 *                      `git diff --numstat <base>...HEAD` (PR diff
 *                      against the base ref). The four reads are
 *                      ALWAYS unioned regardless of which subset
 *                      yields paths — that keeps the contract a
 *                      superset (no misses) and matches both local
 *                      and CI invocations: locally the first three
 *                      carry uncommitted edits; in CI they are empty
 *                      after `actions/checkout`, and the
 *                      base-diff catches the committed-but-misplaced
 *                      pack on the PR branch. The base-ref read
 *                      soft-fails (try/catch) when the base ref is
 *                      unreachable (e.g. a fork or a local repo
 *                      without `origin/main` fetched), so a missing
 *                      base never hard-fails the lane.
 *   - `--base-ref <ref>` force the PR-diff base. Defaults to
 *                      `origin/main`.
 *   - `--changed <csv>` accept a comma-separated path list directly.
 *                      Used by integration tests so they need not spin
 *                      up a real git repo.
 *
 * Directory-only matching:
 *   `review-*` / `discussion-*` is a DIRECTORY pattern. Path segments
 *   are matched against `PACK_SEGMENT_RE` ONLY when the segment is NOT
 *   the final filename (i.e. the path has more segments after it).
 *   This prevents false fires on harmless files like
 *   `docs/review-notes.md` whose final filename happens to start with
 *   `review-`.
 *
 * Exit codes:
 *   0 — no misplaced pack directories in the changed scope.
 *   1 — at least one R-PACK-LOCATION-DRIFT violation emitted to stderr.
 *   2 — invalid invocation (unknown flag etc.).
 */

import { execFileSync } from "node:child_process";
import { argv, exit, stderr } from "node:process";

/**
 * Pack-kind detection. A "pack directory" is a directory whose name
 * starts with `review-` or `discussion-` followed by at least one
 * additional character (matches `review-<ts>`, `review-<slug>`, etc.).
 */
const PACK_SEGMENT_RE = /^(review|discussion)-.+/;

/**
 * Allowed-root prefixes per pack kind. Path comparisons are done on
 * forward-slash normalized paths.
 */
const ALLOWED_ROOTS = {
  review: [".qfai/review", "tmp"],
  discussion: [".qfai/discussion", "tmp"],
};

/**
 * The `git diff` flags every read here shares.
 *
 * `--numstat`, not `--name-only`. The lane asks which paths this change
 * touched, and `--name-only` answers a different question: it selects by
 * blob identity and ignores the whitespace flags, so a commit that
 * re-normalises line endings hands over the whole tree and the lane
 * reports the location of packs nobody moved.
 *
 * `--ignore-cr-at-eol` rather than `--ignore-all-space`, which reaches
 * too far — it also hides an indentation change, and indentation is
 * meaningful in the documents these packs hold.
 *
 * `--no-renames` keeps the path field plain: with rename detection on,
 * numstat writes `{old => new}` inside it.
 */
const NUMSTAT_DIFF = ["diff", "--numstat", "--ignore-cr-at-eol", "--no-renames"];

/**
 * The path a `--numstat` line names.
 *
 * A line is `<added>\t<deleted>\t<path>`, so the path begins after the
 * second tab and may itself contain one.
 */
function numstatPath(line) {
  const first = line.indexOf("\t");
  if (first < 0) return "";
  const second = line.indexOf("\t", first + 1);
  if (second < 0) return "";
  return line.slice(second + 1).trim();
}

/**
 * Paths the index no longer carries while the working tree still holds
 * the file.
 *
 * `git rm --cached` is how a pack stops being tracked without leaving
 * the contributor's disk. It stages a deletion and leaves an untracked
 * file behind, so status names the pack and the staged diff calls it a
 * removal. Reading status alone would take that for a pack being
 * introduced, which is the reverse of what happened.
 */
function stagedDeletions() {
  try {
    const out = execFileSync("git", [...NUMSTAT_DIFF, "--diff-filter=D", "--cached", "HEAD"], {
      encoding: "utf-8",
    });
    return new Set(
      out
        .split("\n")
        .map((line) => numstatPath(line))
        .filter((p) => p.length > 0),
    );
  } catch {
    // The caller reads the staged diff first and soft-passes when git
    // fails there, so this is unreachable in practice. An empty set
    // leaves the untracked half unfiltered rather than dropping it.
    return new Set();
  }
}

/**
 * Paths git has never seen, which have no diff to read.
 *
 * `--untracked-files=all` lists each untracked FILE. The default
 * collapses a wholly new directory to `review-bad/`, and a pack segment
 * is only read when a segment follows it — so the one shape this lane
 * most needs to catch, a misplaced pack nobody has staged yet, arrived
 * as a bare directory name and matched nothing.
 *
 * Returns null when git fails, which the caller reads as a soft pass.
 */
function readUntracked() {
  let status;
  try {
    status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      encoding: "utf-8",
    });
  } catch (err) {
    stderr.write(
      `check-pack-locations: git status --porcelain failed: ${err && err.message ? err.message : String(err)}\n`,
    );
    return null;
  }
  const removed = stagedDeletions();
  const paths = [];
  for (const line of status.split("\n")) {
    if (line.trim().length === 0) continue;
    // Untracked entries only — `??` in both code columns. Tracked
    // changes come from the diffs, where the whitespace flag applies.
    if (line.slice(0, 2) !== "??") continue;
    const raw = line.slice(2).trim();
    if (raw.length === 0 || removed.has(raw)) continue;
    paths.push(raw);
  }
  return paths;
}

function parseArgs(args) {
  const out = { changed: undefined, baseRef: undefined, help: false };
  for (let i = 2; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--changed") {
      out.changed = args[i + 1] ?? "";
      i += 1;
    } else if (a === "--base-ref") {
      out.baseRef = args[i + 1] ?? "";
      i += 1;
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    } else {
      stderr.write(`check-pack-locations: unknown argument ${JSON.stringify(a)}\n`);
      return null;
    }
  }
  return out;
}

function printHelp() {
  stderr.write(
    [
      "Usage: check-pack-locations.mjs [--changed <csv-paths>]",
      "",
      "Modes:",
      "  (default)         use git to compute staged + working-tree changes",
      "  --changed <csv>   accept a comma-separated changed-path list (test mode)",
      "",
      "Emits R-PACK-LOCATION-DRIFT to stderr and exits non-zero when a",
      "review-*/ or discussion-*/ directory is introduced outside the",
      "allowed roots (.qfai/review/, .qfai/discussion/, tmp/). The rule",
      "is documented in .agents/rules/root-additions-policy.md.",
      "",
    ].join("\n"),
  );
}

function readChangedFromGit(baseRef) {
  // Combine staged + working-tree changes AND PR-diff changes. We
  // want every path that the current PR would land —
  //   - `--cached` (staged) and unstaged edits matter locally, because
  //     a contributor may have written a misplaced pack but not
  //     staged it yet when `pnpm ci:lint` runs.
  //   - `<base>...HEAD` matters in CI: after `actions/checkout` the
  //     working tree is clean (everything committed) so the
  //     staged/unstaged sets are empty; a committed-but-misplaced
  //     pack on the PR branch would otherwise slip through.
  const set = new Set();
  try {
    const staged = execFileSync(
      "git",
      // Lower-case `d` EXCLUDES deletions. The lane reports a pack
      // introduced outside its allowed root, and a removal is the
      // opposite: without this, deleting a legacy pack from a
      // disallowed location reports every file in it as a new
      // violation, and the only way to land the removal is to keep
      // the pack.
      [...NUMSTAT_DIFF, "--diff-filter=d", "--cached", "HEAD"],
      { encoding: "utf-8" },
    );
    for (const line of staged.split("\n")) {
      const p = numstatPath(line);
      if (p.length > 0) set.add(p);
    }
  } catch (err) {
    stderr.write(
      `check-pack-locations: git diff --cached failed: ${err && err.message ? err.message : String(err)}\n`,
    );
    // Soft-pass on git failure: the canonical PR-level CI re-runs in
    // a full clone. Local invocation outside a git tree should not
    // hard-fail the lane.
    return null;
  }
  // Unstaged edits to tracked files. `git status` cannot take a
  // whitespace flag, so the tracked half is read as a diff and only the
  // untracked half comes from status below. Splitting them is what lets
  // a line-ending rewrite drop out here too: without it the local run
  // stays noisy while the CI run is clean, and the lane would be scoped
  // by changed text in one place and changed bytes in another.
  try {
    const unstaged = execFileSync("git", [...NUMSTAT_DIFF, "--diff-filter=d"], {
      encoding: "utf-8",
    });
    for (const line of unstaged.split("\n")) {
      const p = numstatPath(line);
      if (p.length > 0) set.add(p);
    }
  } catch (err) {
    stderr.write(
      `check-pack-locations: git diff (unstaged) failed: ${err && err.message ? err.message : String(err)}\n`,
    );
    return null;
  }
  const untracked = readUntracked();
  if (untracked === null) return null;
  for (const p of untracked) set.add(p);
  // PR-diff scan against the base ref. The explicit `--base-ref`
  // argument wins; otherwise default to `origin/main` (matches the
  // pair-changed CI lane and our ci.yml `fetch-depth: 0`). If the
  // base ref is unreachable (local invocation without origin/main),
  // the inner try/catch soft-fails and we keep going — the local
  // case is already covered by the staged/status reads above.
  const effectiveBase = baseRef && baseRef.length > 0 ? baseRef : "origin/main";
  try {
    const diff = execFileSync(
      "git",
      [...NUMSTAT_DIFF, "--diff-filter=d", `${effectiveBase}...HEAD`],
      { encoding: "utf-8" },
    );
    for (const line of diff.split("\n")) {
      const p = numstatPath(line);
      if (p.length > 0) set.add(p);
    }
  } catch {
    // Soft-pass: base ref not reachable (e.g. local invocation, or
    // PR runs from a fork without origin/main fetched). Local cases
    // remain covered by the staged + status reads above.
  }
  return Array.from(set);
}

function normalizeCsvSet(csv) {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

/**
 * For a single path, identify the FIRST segment that matches a pack
 * pattern (review-* / discussion-*) AND is not contained within an
 * allowed-root prefix. Returns the violation descriptor or null when
 * no violation is present.
 */
function findViolationInPath(rawPath) {
  const posix = toPosix(rawPath).replace(/^\.\//, "").replace(/^\/+/, "");
  if (posix.length === 0) return null;
  const segments = posix.split("/").filter((s) => s.length > 0);
  // Pack patterns are DIRECTORY patterns: a `review-*` / `discussion-*`
  // segment counts only when it has at least one path segment after it
  // (i.e. the segment is a directory, not the final filename). This
  // skips the last segment so a harmless file like
  // `docs/review-notes.md` whose filename happens to start with
  // `review-` is not falsely flagged as a misplaced pack directory.
  // Pack DIRECTORIES emitted by `git diff --name-only` are always
  // followed by their child files, so they remain detectable.
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i];
    const m = PACK_SEGMENT_RE.exec(seg);
    if (!m) continue;
    const kind = m[1];
    const parentPrefix = segments.slice(0, i).join("/");
    const allowedRoots = ALLOWED_ROOTS[kind];
    const allowed = allowedRoots.some(
      (root) => parentPrefix === root || parentPrefix.startsWith(root + "/"),
    );
    if (allowed) return null;
    const proposed = `.qfai/${kind}/${seg}/`;
    return {
      kind,
      segment: seg,
      misplaced: `${parentPrefix.length > 0 ? `${parentPrefix}/` : ""}${seg}/`,
      proposed,
      offendingPath: posix,
    };
  }
  return null;
}

function emitFinding(v) {
  const message =
    `R-PACK-LOCATION-DRIFT: misplaced ${v.kind}-* pack directory ${v.misplaced} ` +
    `(offending path: ${v.offendingPath}). ` +
    `The allowed root for ${v.kind}-* packs is .qfai/${v.kind}/ ` +
    `(see .agents/rules/root-additions-policy.md). ` +
    `Proposed correct path: ${v.proposed}\n`;
  stderr.write(message);
}

function main() {
  const args = parseArgs(argv);
  if (args === null) return 2;
  if (args.help) {
    printHelp();
    return 0;
  }

  let changed;
  if (typeof args.changed === "string") {
    changed = normalizeCsvSet(args.changed);
  } else {
    const computed = readChangedFromGit(args.baseRef);
    if (computed === null) {
      // Soft-pass when git is unavailable / errored — see comment in
      // readChangedFromGit. Mirrors the prompt-scanner pair lane.
      return 0;
    }
    changed = computed;
  }

  // De-duplicate pack-directory violations: when several files share the
  // same misplaced pack root (e.g. `review-2026-05-27/PLAN.md` and
  // `review-2026-05-27/NOTES.md`), one finding line per misplaced
  // directory is enough for the operator. Key on `misplaced` path.
  const seen = new Set();
  let violationCount = 0;
  for (const p of changed) {
    const v = findViolationInPath(p);
    if (v === null) continue;
    if (seen.has(v.misplaced)) continue;
    seen.add(v.misplaced);
    emitFinding(v);
    violationCount += 1;
  }

  return violationCount > 0 ? 1 : 0;
}

const code = main();
exit(code);
