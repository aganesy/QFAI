# 10 Plan

- Spec: spec-0027
- Parent: CAP-0027

## Implementation Sequence

### Step 1: shared UI-bearing classification helper

- Implement a single deterministic helper that resolves UI-bearing state from discussion/spec inputs.
- Use explicit surface classification as the primary SSOT.
- Use content signals only as fallback when surface classification is missing or ambiguous, and apply negative overrides before activation.

### Step 2: structural validators

- Implement validators for sidecar presence, strategy completeness, scoring completeness, comparison/anchor completeness, and screen-contract minimum structure.
- Keep each validator pure, file-system only, and independently testable.
- Emit actionable issue payloads with `ruleId`, `filePath`, `severity`, `description`, and `fixSuggestion`.

### Step 3: migration and stale-asset checks

- Add migration detection for legacy packs missing the new uiux structure.
- Default migration output to warning; escalate only via config.
- Include explicit stale-asset guidance so richer completion expectations do not become a silent breaking change.

### Step 4: semantic reviewer templates

- Implement the UIX-REV prompt set as a separate, revertable layer.
- Keep semantic review out of deterministic validate logic.
- Align prompt categories with the current design model: strategy choice, research translation, 3-layer scoring, anchor quality, generic fallback risk, and contract completeness.

## File Targets

- `packages/qfai/src/core/validators/uixDetection.ts`
- `packages/qfai/src/core/validators/uix*.ts`
- `packages/qfai/src/core/validate.ts`
- `packages/qfai/src/core/config.ts`
- `packages/qfai/assets/uix-rev/**`
- `packages/qfai/tests/core/**`
- `packages/qfai/tests/integration/**`

## Test Strategy

- Integration: `tests/integration/**` must cover TC annotations for primary validator behaviors, especially surface classification primary/fallback routing, migration severity, and stale-asset detection.
- E2E: `tests/e2e/**` only for user-visible validate/report flows that correspond to `US-0027-*`; do not move TC coverage into E2E.
- API: no `tests/api/**` obligation unless a `CON-API-*` contract is introduced later.
- Gate checks:
  - deterministic repeated-run check for identical issue sets
  - performance budget check for combined UIX validators
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- False positives from content-only heuristics: keep content signals as fallback only.
- Drift from `spec-0026`: generation and validation fixtures must be paired and updated together.
- Hidden runtime coupling: enforce zero browser/network/render imports in validator tests.

## v1.7.9 Convergence Note

- canonical validator registration は production validate path に統一し、isolated validator capability を completion claim に使わない。
- deterministic validate と semantic review の責務分離を維持する。
- non-UI safety と stale-asset migration guidance は v1.7.9 correction release でも hard gate 前提の補助条件として扱う。

## v1.7.11 Completion Steps

### Step: Register all UIX-VAL validators via canonical entrypoint

- Register all UIX-VAL validators (structural, migration, stale-asset) through `runCanonicalUixValidators()` entrypoint from spec-0002.
- Verify old aggregator (`runAllUixValidators()`) delegates correctly to the canonical path without duplicating validator execution.

### Test Strategy

- TC-0027-0049: All UIX-VAL validators are registered and discoverable via canonical entrypoint. Verify validator count matches expected registry.
- TC-0027-0050: `runAllUixValidators()` wrapper produces identical issue set as direct `runCanonicalUixValidators()` call (no duplication, no omission).
