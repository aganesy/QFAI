#!/usr/bin/env bash
# Fail if QFAI internal spec IDs or internal version markers leak into
# distributed surfaces. Distributed surface = paths listed in
# packages/qfai/package.json "files" field. The npm package version is
# the only canonical version.
set -euo pipefail

# An explicit root lets the release workflow scan an unpacked tarball — what
# npm actually receives — rather than a dist/ that `prepack` rebuilds between
# the check and the upload.
if [[ -n "${QFAI_LEAKAGE_SCAN_ROOT:-}" ]]; then
  ROOT="$QFAI_LEAKAGE_SCAN_ROOT"
elif [[ -d "packages/qfai" ]]; then
  ROOT="packages/qfai"
elif [[ -f "../qfai/package.json" ]]; then
  ROOT="../qfai"
else
  ROOT="."
fi

fail=0

# SSOT-sync (PR #206 review Nv4N): the regex set below is mirrored in
#   - packages/qfai/scripts/lint-shipping.ts `src-comment` rules
#     (pre-build, JSDoc → dist/*.d.ts path)
#   - packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts
#     `PATTERNS` array (smoke against `qfai init` output)
# Updating a regex here (e.g. tightening INTERNAL_VERSION_RE to a
# QFAI-context pattern) requires updating both other sites in the same
# PR. See `.agents/rules/distributed-surface.md` "Defenses (4 layers)".
#
# The same three regexes are applied twice per surface: once to file
# CONTENT and once to file NAMES (see the loop at the bottom). The smoke
# test mirrors both dimensions; `lint-shipping.ts` scans `src/**` comment
# text only, and source file names reach the distributed surface as
# `dist/` names, which this script's name pass covers post-build.

# Internal spec IDs: spec-0010 and above are QFAI-internal specs.
# spec-0001..0009 are reserved for sample / Category-B template usage and
# are tolerated.
#
# "10 and above" as a numeric property, not as a list of digit shapes:
# `0*` eats any number of leading zeros, then a non-zero digit followed by at
# least one more digit is a value of 10 or more. Enumerating shapes is what let
# `spec-9999` (no leading zero) and `spec-00100` (two of them) through
# different layers. The `[sS]` spelling is deliberate — a spec directory may
# legally be `SPEC-0042` on a case-sensitive filesystem, so a case-exact guard
# misses the id in exactly the tree that produced it.
INTERNAL_SPEC_RE='[sS][pP][eE][cC]-0*[1-9][0-9]+'

# Internal version markers: any "vN.M" or "vN.M.P" outside of
# package.json version, plus the "v1.x" sentinel. Intentionally broad
# in YAGNI mode: this regex does NOT distinguish QFAI-internal version
# markers from third-party version mentions (e.g. "Node.js v20",
# "TypeScript v5.4", or example URLs containing "v1"/"v2"). The
# distributed surfaces currently in scope (README.md / assets/ / dist/)
# do not contain such third-party version mentions, so the broad pattern
# is acceptable as a structural backstop.
#
# Mid-term path: tighten to a QFAI-context regex such as
# `\bQFAI[ -]v[0-9]+\.[0-9]+\.[0-9]+\b` once the Rule of Three triggers
# (i.e., once a real third-party version reference needs to appear in a
# distributed surface). On false positives, inspect the offending file
# and CHANGELOG to confirm whether the version is QFAI-internal or
# third-party context. See .agents/rules/distributed-surface.md.
INTERNAL_VERSION_RE='\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b|\bv1\.x\b'

# QFAI internal trace IDs that should not leak (CAP-0010+, DEC, DR,
# OQ-NNNN-NNNN, QFAI-PROT2-NNN, CHG-NNN). OQ-NNNN-NNNN was added in PR #208
# 11th late-review wave (codex r3265386185, LOW) to keep
# `08_Open-questions.md` internal references out of distributed surfaces.
# CHG-NNN is the cross-spec change ID from `_policies/10_delta.md`; it
# resolves to nothing outside this repository, so a consuming project that
# receives one has no way to look it up.
INTERNAL_ID_RE='\bCAP-0(0[1-9][0-9]|[1-9][0-9]{2,})\b|\bDEC-[0-9]{4}-[0-9]{4}\b|\bDR-[0-9]{4}\b|\bQFAI-PROT2-[0-9]+\b|\bOQ-[0-9]{4}-[0-9]{4}\b|\bCHG-[0-9]+\b'

# Version-class exemption for the FILE NAME pass below.
#
# Migration memo file names are version-stamped on purpose: they are
# ADR-style citation targets whose names must stay stable once
# published, and `migrationMemoRelativePath()` in
# `src/core/paths/assistantPaths.ts` mints one per
# `--upgrade-assistant-tree` run. This exemption keeps that intentional
# producer visible instead of accidental. It is scoped to the version
# class only — a spec id or trace id in a migration path is still a
# leak — and it applies to names only; memo *contents* keep the full
# content scan.
#
# The exemption is expressed as a *rewrite of the sanctioned name*, not
# as an inverted match that drops every line mentioning the memo
# directory. Dropping whole lines would also excuse
# `.../migrations/notes-v2.0-draft.md`,
# `.../migrations/drafts-v2.0/clean.md`, and any file in an unrelated
# tree that happens to carry the same path fragment. Instead the exact
# shape documented in `.agents/rules/distributed-surface.md` —
# `.qfai/assistant/process/migrations/v<MAJOR>.<MINOR>.<PATCH>[-*].md`,
# directly in that directory — has its version stamp replaced by a
# placeholder before the version regex runs, so anything else in the
# same directory is still scanned.
MIGRATION_MEMO_STAMP_SED='s#(^|/)\.qfai/assistant/process/migrations/v[0-9]+\.[0-9]+\.[0-9]+(-[^/]*)?\.md$#\1.qfai/assistant/process/migrations/MEMO\2.md#'

# Schema version field (any literal "schemaVersion") in distributed
# surfaces. Generated artifact schemas no longer carry this field.
# PR #206 review NzWr: use POSIX `[[:space:]]` (= `\s` equivalent in
# JS RegExp) so the whitespace class matches the layer 1 (lint) and
# layer 3 (smoke) regexes character-for-character. Previous
# `schemaVersion *:` (literal space) would let `schemaVersion\t:` /
# `schemaVersion\n:` slip through this final backstop.
SCHEMA_VERSION_RE='"schemaVersion"|schemaVersion[[:space:]]*:'

# Scope: derived dynamically from package.json "files" field.
# The "files" field is the SSOT for what npm ships; this guard scans
# every entry that exists on disk so it stays in sync without manual
# maintenance.
#
# The node lookup is captured into a variable (rather than a process
# substitution into mapfile) so that a non-zero exit from node — for
# example an unparseable package.json or missing files[] field — fails
# this guard instead of being silently swallowed by `mapfile < <(...)`.
# A silent pass would defeat the purpose of the leakage guard.
files_listing=$(node -e '
  const path = require("node:path");
  const pkg = require(path.resolve(process.argv[1], "package.json"));
  if (!Array.isArray(pkg.files)) {
    console.error("package.json missing files[] field");
    process.exit(1);
  }
  for (const f of pkg.files) console.log(f);
' "$ROOT") || {
  echo "ERROR: could not enumerate package.json#files for $ROOT" >&2
  exit 1
}
mapfile -t FILES_FIELD <<< "$files_listing"

SCAN_PATHS=()
# `SCAN_RELATIVES` keeps each surface as its `package.json#files` entry,
# i.e. relative to `$ROOT`. The FILE NAME pass must use these: when
# `QFAI_LEAKAGE_SCAN_ROOT` points at an absolute path (the release
# workflow unpacks the tarball into a temp dir), `find "$ROOT/$entry"`
# emits the *root's own* ancestors on every line, so a checkout under
# e.g. `/tmp/qfai-v2.0/package` would fail the version regex on every
# path even when the distributed surface is clean. The distributed
# surface is the files[] entry, not the directory that happens to hold
# it.
SCAN_RELATIVES=()
SKIPPED_PATHS=()
for entry in "${FILES_FIELD[@]}"; do
  # `package.json#files` is treated as literal paths (or directories).
  # Glob patterns like `dist/**` or `assets/*.md` are NOT expanded; if
  # they appear, the leakage guard would silently miss them, so detect
  # and refuse explicitly. If glob support becomes necessary, plumb
  # `fast-glob` (or equivalent) into the node lookup above.
  if [[ "$entry" == *"*"* || "$entry" == *"?"* ]]; then
    echo "ERROR: package.json#files contains a glob pattern '$entry'." >&2
    echo "       This guard expects literal file/directory paths only." >&2
    echo "       Either drop the glob from package.json#files or extend" >&2
    echo "       this guard to expand globs explicitly." >&2
    exit 1
  fi
  candidate="$ROOT/$entry"
  # dist/ may not exist in lint-only CI passes; record what is skipped
  # so the WARN below can name it instead of leaving the operator
  # guessing whether scan coverage was complete.
  if [[ -e "$candidate" ]]; then
    SCAN_PATHS+=("$candidate")
    SCAN_RELATIVES+=("$entry")
  else
    SKIPPED_PATHS+=("$candidate")
  fi
done

if [[ "${#SCAN_PATHS[@]}" -eq 0 ]]; then
  # SCAN_PATHS being completely empty means package.json#files was
  # rewritten to an unknown layout. README.md / LICENSE / assets/ are
  # checked-in artifacts and are normally always present; only dist/
  # is build-time, so a totally empty scan set is an anomaly.
  echo "WARN: no distributed surfaces found under $ROOT; nothing scanned." >&2
elif [[ "${#SKIPPED_PATHS[@]}" -gt 0 ]]; then
  # Lint-only CI passes legitimately skip dist/ (no build yet); the
  # post-build job re-runs this same guard so dist/ is always covered
  # eventually. Name what was scanned vs skipped so reviewers do not
  # have to guess.
  echo "WARN: scanned ${#SCAN_PATHS[@]} surface(s); skipped ${#SKIPPED_PATHS[@]} that are not on disk yet (e.g. dist/ before build): ${SKIPPED_PATHS[*]}" >&2
fi

for idx in "${!SCAN_PATHS[@]}"; do
  target="${SCAN_PATHS[$idx]}"
  relative_target="${SCAN_RELATIVES[$idx]}"
  hits=$(grep -rnE "$INTERNAL_SPEC_RE|$INTERNAL_VERSION_RE|$INTERNAL_ID_RE" "$target" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "FAIL: internal spec id, version marker, or trace id leaked in $target:" >&2
    echo "$hits" | head -20 >&2
    fail=1
  fi

  # File NAME pass: `grep -rn` matches lines *inside* files, so a marker
  # encoded in a path component — `v1.4.27-atdd-alignment.md`,
  # `spec-0042-notes.md`, a `DR-0007/` directory — ships with a green
  # result even though the name is copied verbatim into every consuming
  # project. Run the same regexes over the path list to close that
  # dimension, and report it separately so the operator can tell a name
  # leak from a content leak.
  # `./` prefix: a `package.json#files` entry may legitimately begin with a
  # hyphen, and `find -notes-v2.0` reads that as a predicate rather than a
  # starting point. Suppressed, that failure looked exactly like an empty
  # tree — the guard skipped the surface and still exited 0. Anchor the
  # start point, and fail loudly when the enumeration itself fails: a name
  # pass that could not list its target has not cleared it.
  if ! target_paths=$(cd "$ROOT" && find "./$relative_target" -print 2>&1); then
    echo "FAIL: could not enumerate $relative_target for the FILE NAME pass:" >&2
    printf '%s\n' "$target_paths" | head -5 >&2
    fail=1
    target_paths=""
  fi
  name_hits=$(printf '%s\n' "$target_paths" \
    | grep -E "$INTERNAL_SPEC_RE|$INTERNAL_ID_RE" || true)
  version_name_hits=$(printf '%s\n' "$target_paths" \
    | sed -E "$MIGRATION_MEMO_STAMP_SED" \
    | grep -E "$INTERNAL_VERSION_RE" || true)
  if [[ -n "$name_hits" || -n "$version_name_hits" ]]; then
    echo "FAIL: internal spec id, version marker, or trace id leaked in a FILE NAME under $target:" >&2
    # `fail=1` is already decided above; this only tidies the REPORT, by
    # keeping the lines that carry a path when one of the two hit sets is
    # empty. Written as a positive match on purpose: TDD-0033 pins that the
    # only inverted grep in this script is the schemaVersion carve-out
    # below, so that no filter can ever sit between a hit and the FAIL path.
    { printf '%s\n%s\n' "$name_hits" "$version_name_hits" \
      | grep -E '[^[:space:]]' | head -20 >&2; } || true
    fail=1
  fi
  schema_hits=$(grep -rnE "$SCHEMA_VERSION_RE" "$target" 2>/dev/null \
    | grep -vE 'package\.json' || true)
  if [[ -n "$schema_hits" ]]; then
    echo "FAIL: schemaVersion field present in distributed surface $target:" >&2
    echo "$schema_hits" | head -20 >&2
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
echo "OK: no internal spec ids, version markers, or schemaVersion fields leaked into distributed surfaces."
