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
 *   - review-*      .qfai/review/<pack-name>/  (or tmp/<pack-name>/)
 *   - discussion-*  .qfai/discussion/<pack-name>/  (or tmp/<pack-name>/)
 *
 * Scope (per the pack-location lint scope decision):
 *   The lane inspects ONLY the changed paths in scope of the current
 *   work (PR diff against base in CI, or staged + working-tree changes
 *   locally; or the explicit list passed via `--changed`). It is NOT a
 *   full working-tree walk — untouched legacy packs that pre-date the
 *   rule are deliberately not re-flagged.
 *
 * Invocation modes:
 *   - default          local: read staged + working-tree changes from
 *                      `git`. CI: when neither yields any paths AND
 *                      `--base-ref` is available (or `origin/main` is
 *                      reachable), additionally consult
 *                      `git diff --name-only <base>...HEAD` so a
 *                      committed-but-misplaced pack on the PR branch
 *                      is still caught after the CI checkout brings
 *                      the working tree to a clean HEAD.
 *   - `--base-ref <ref>` force the PR-diff base for CI invocations.
 *                      Defaults to `origin/main` when omitted in CI.
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
    const staged = execFileSync("git", ["diff", "--name-only", "--cached", "HEAD"], {
      encoding: "utf-8",
    });
    for (const line of staged.split("\n")) {
      const t = line.trim();
      if (t.length > 0) set.add(t);
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
  try {
    const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf-8" });
    for (const line of status.split("\n")) {
      // Each non-empty status line is `XY <path>` (and optionally
      // ` -> <newpath>` for renames). Split on whitespace; the LAST
      // token is the path that should be considered.
      const t = line.trim();
      if (t.length === 0) continue;
      const arrow = t.indexOf(" -> ");
      const raw = arrow >= 0 ? t.slice(arrow + 4) : t.slice(2).trim();
      if (raw.length > 0) set.add(raw);
    }
  } catch (err) {
    stderr.write(
      `check-pack-locations: git status --porcelain failed: ${err && err.message ? err.message : String(err)}\n`,
    );
    return null;
  }
  // PR-diff scan against the base ref. The explicit `--base-ref`
  // argument wins; otherwise default to `origin/main` (matches the
  // pair-changed CI lane and our ci.yml `fetch-depth: 0`). If the
  // base ref is unreachable (local invocation without origin/main),
  // the inner try/catch soft-fails and we keep going — the local
  // case is already covered by the staged/status reads above.
  const effectiveBase = baseRef && baseRef.length > 0 ? baseRef : "origin/main";
  try {
    const diff = execFileSync("git", ["diff", "--name-only", `${effectiveBase}...HEAD`], {
      encoding: "utf-8",
    });
    for (const line of diff.split("\n")) {
      const t = line.trim();
      if (t.length > 0) set.add(t);
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
