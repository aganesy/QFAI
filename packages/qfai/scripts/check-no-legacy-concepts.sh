#!/usr/bin/env bash
# Sanity grep: ensure v1.x prototyping concepts (mode/funnel/polish/branch/
# rubric/calibration/best-of-history/etc.) do not leak back into the
# packages/qfai/ tree after spec-0017 v2.0 (P14).
#
# This script is meant to catch RE-introduction of legacy concepts in
# NEW code. The current baseline tolerates:
#   - explanatory comments documenting v1.x removal (lines mentioning
#     spec-0017 / v1.x / removed / deprecated / legacy)
#   - historical migration documents (docs/MIGRATION-*.md)
#   - the validate.ts error-message dictionary (legacy QFAI-PROT-NNN
#     entries for codes whose validators were deleted but whose message
#     strings stay as documentation of the removed gates)
#   - test fixtures that intentionally inject v1.x shapes to verify the
#     v2.0 validator rejects them
#   - the legacy-FORBIDDEN list inside designContractReadiness.ts
#
# CI integration: invoke as `bash packages/qfai/scripts/check-no-legacy-concepts.sh`
# from the qfai-validate workflow.
set -euo pipefail

if [[ -d "packages/qfai" ]]; then
  ROOT="packages/qfai"
elif [[ -f "../qfai/package.json" ]]; then
  ROOT="../qfai"
else
  ROOT="."
fi

PATTERNS=(
  "low-cost"
  "full-harness"
  "maxCycles"
  "maxIterationsByMode"
  "round-start"
  "round-harvest"
  "round-narrow"
  "round-absorb"
  "harvestBuilder"
  "absorptionBuilder"
  "reimplementationBuilder"
  "branchPlanner"
  "plateauDetector"
  "candidateConcept"
  "polishCycle"
  "bestOfHistory"
  "allReviewerAxesPerfect100"
  "conceptFit"
  "regressionAlert"
  "BreakthroughConfig"
  "evaluation-rubric"
  "evaluator-calibration"
  "absorption-policy"
  "selected-direction"
)

EXCLUDE_DIRS=(
  --exclude-dir=tmp
  --exclude-dir=node_modules
  --exclude-dir=dist
  --exclude-dir=.qfai
)

# Files where legacy mentions are intentional (historical / dictionary /
# fixtures). Mentions in these files do not indicate re-introduction.
EXCLUDE_FILES_RE='(MIGRATION-1\.8\.4\.md|MIGRATION-2\.0\.md|src/cli/commands/validate\.ts|src/core/validators/designContractReadiness\.ts|tests/.*\.test\.ts|REDESIGN-2\.0)'

# Lines that explain v2.0 removal explicitly are not a re-introduction.
LEGACY_EXPLAINER_RE='spec-0017|v1\.x|REMOVED|removed (in|under|by|alongside)|deprecated|legacy|FORBIDDEN_LEGACY|v2\.0|^[[:space:]]*(//|#|\*)'

leaked=0
for pattern in "${PATTERNS[@]}"; do
  hits=$(grep -rFn \
       "${EXCLUDE_DIRS[@]}" \
       --exclude="$(basename "$0")" \
       "$pattern" "$ROOT" 2>/dev/null || true)
  if [[ -z "$hits" ]]; then
    continue
  fi
  filtered=$(echo "$hits" \
    | grep -vE "$EXCLUDE_FILES_RE" \
    | grep -vE "$LEGACY_EXPLAINER_RE" \
    || true)
  if [[ -n "$filtered" ]]; then
    echo "FAIL: legacy concept '$pattern' leaked back into $ROOT/" >&2
    echo "$filtered" | head -5 >&2
    leaked=1
  fi
done

if [[ "$leaked" -ne 0 ]]; then
  exit 1
fi

echo "OK: no legacy v1.x prototyping concepts present in $ROOT/"
exit 0
