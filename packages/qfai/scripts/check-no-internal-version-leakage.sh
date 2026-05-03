#!/usr/bin/env bash
# Fail if QFAI internal spec IDs or internal version markers leak into
# distributed surfaces. Distributed surface = paths listed in
# packages/qfai/package.json "files" field. The npm package version is
# the only canonical version.
set -euo pipefail

if [[ -d "packages/qfai" ]]; then
  ROOT="packages/qfai"
elif [[ -f "../qfai/package.json" ]]; then
  ROOT="../qfai"
else
  ROOT="."
fi

fail=0

# Internal spec IDs: spec-0010 and above are QFAI-internal specs.
# spec-0001..0009 are reserved for sample / Category-B template usage and
# are tolerated.
INTERNAL_SPEC_RE='spec-0(0[1-9][0-9]|[1-9][0-9]{2,})'

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

# QFAI internal trace IDs that should not leak (CAP-0010+, DEC, DR, BR-XXXX-XXXX, etc.)
INTERNAL_ID_RE='\bCAP-0(0[1-9][0-9]|[1-9][0-9]{2,})\b|\bDEC-[0-9]{4}-[0-9]{4}\b|\bDR-[0-9]{4}\b|\bQFAI-PROT2-[0-9]+\b'

# Schema version field (any literal "schemaVersion") in distributed
# surfaces. Generated artifact schemas no longer carry this field.
SCHEMA_VERSION_RE='"schemaVersion"|schemaVersion *:'

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

for target in "${SCAN_PATHS[@]}"; do
  hits=$(grep -rnE "$INTERNAL_SPEC_RE|$INTERNAL_VERSION_RE|$INTERNAL_ID_RE" "$target" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "FAIL: internal spec id, version marker, or trace id leaked in $target:" >&2
    echo "$hits" | head -20 >&2
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
