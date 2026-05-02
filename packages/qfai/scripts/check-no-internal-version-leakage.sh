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

# Internal version markers: any "vN.M" or "vN.M.P" outside of package.json
# version, plus the "v1.x" sentinel.
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
mapfile -t FILES_FIELD < <(node -e '
  const path = require("node:path");
  const pkg = require(path.resolve(process.argv[1], "package.json"));
  if (!Array.isArray(pkg.files)) {
    console.error("package.json missing files[] field");
    process.exit(1);
  }
  for (const f of pkg.files) console.log(f);
' "$ROOT")

SCAN_PATHS=()
for entry in "${FILES_FIELD[@]}"; do
  candidate="$ROOT/$entry"
  # dist/ may not exist in lint-only CI passes; skip silently.
  if [[ -e "$candidate" ]]; then
    SCAN_PATHS+=("$candidate")
  fi
done

if [[ "${#SCAN_PATHS[@]}" -eq 0 ]]; then
  echo "WARN: no distributed surfaces found under $ROOT (build may not have run)." >&2
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
