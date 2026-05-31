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
 *   The lane inspects ONLY the staged / changed paths reported by
 *   `git diff --name-only --cached HEAD` and `git status --porcelain`
 *   (or the explicit list passed via `--changed`). It is NOT a full
 *   working-tree walk — untouched legacy packs that pre-date the rule
 *   are deliberately not re-flagged.
 *
 * Invocation modes:
 *   - default          read staged + working-tree changes from `git`.
 *   - `--changed <csv>` accept a comma-separated path list directly.
 *                      Used by integration tests so they need not spin
 *                      up a real git repo.
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
  const out = { changed: undefined, help: false };
  for (let i = 2; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--changed") {
      out.changed = args[i + 1] ?? "";
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

function readChangedFromGit() {
  // Combine staged + working-tree changes. We want every path that the
  // current PR would land — both `--cached` (staged) and unstaged edits
  // matter, because a contributor may have written a misplaced pack
  // but not staged it yet at the moment `pnpm ci:lint` runs locally.
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
  for (let i = 0; i < segments.length; i += 1) {
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
    const computed = readChangedFromGit();
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
