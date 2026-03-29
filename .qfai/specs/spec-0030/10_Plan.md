# 10 Plan

- Spec: spec-0030
- Parent: CAP-0030

## Implementation Sequence

### Step 1: calibration pack schema

- Define the calibration asset structure, thresholds, and alignment examples in a single loader-friendly schema.
- Use the canonical 3-layer keys only.
- Make threshold updates traceable to spec delta and decisions.

### Step 2: loader and validation

- Implement pack loading, validation, and reload behavior.
- Accept missing `productSpecific` only via explicit generic-default handling.
- Emit migration guidance when legacy 4-axis data is encountered.

### Step 3: scoring and decision policy

- Implement accept/refine/pivot scoring against the calibration pack.
- Keep disagreement handling deterministic with the currently adopted majority/tie-break policy.
- Keep plateau detection separate from scoring so it can evolve without reshaping the pack.

### Step 4: migration utility

- Add a dedicated migration path for legacy 4-axis calibration assets.
- Preserve values rather than discarding them.
- Make migrated output pass the same 3-layer validation gate.

## File Targets

- `packages/qfai/src/core/calibration/types.ts`
- `packages/qfai/src/core/calibration/loader.ts`
- `packages/qfai/src/core/calibration/scoring.ts`
- `packages/qfai/src/core/calibration/disagreement.ts`
- `packages/qfai/src/core/calibration/plateau.ts`
- `packages/qfai/src/core/calibration/migrate.ts`
- `packages/qfai/tests/integration/calibration/**`
- `packages/qfai/tests/e2e/**`

## Test Strategy

- Integration: TC coverage for load/fallback, 3-layer validation, generic-default handling, majority/tie-break behavior, plateau exit, and migration output validity.
- E2E: user-visible harness runs that consume a calibration pack and produce stable accept/refine/pivot decisions.
- API: none.
- Gate checks:
  - reject unknown dimensions
  - preserve values through migration
  - confirm `qfai validate --fail-on error --format github`

## Risks and Controls

- 3-layer drift with critique adapter: share key names and migration expectations with `spec-0029`.
- Silent threshold changes: require tests plus traceability reference in change review.
- Plateau false positives: keep lookback/delta configurable and isolated from schema definition.
