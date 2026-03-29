# 10 Plan

## Implementation Strategy

### Phase 1: Calibration Pack Schema (Priority: P1)

1. Define calibration pack schema in `packages/qfai/src/core/calibration/types.ts`
   - `CalibrationPack`: examples, scoring alignment, thresholds
   - `ScoringAlignment`: dimension weights, score ranges, alignment examples
   - `EvaluationPolicy`: accept/refine/pivot thresholds

2. Implement calibration pack loader in `packages/qfai/src/core/calibration/loader.ts`
   - YAML/JSON file loading from `.qfai/calibration/` or configured path
   - Schema validation on load
   - Default fallback when pack is missing (with warning)
   - Mid-session reload support

### Phase 2: Scoring Engine (Priority: P1)

1. Implement scoring engine in `packages/qfai/src/core/calibration/scoring.ts`
   - Apply scoring alignment to evaluator output
   - Weighted dimension scoring
   - Accept/refine/pivot decision based on thresholds

### Phase 3: Plateau Detection (Priority: P1)

1. Implement plateau detection in `packages/qfai/src/core/calibration/plateau.ts`
   - Score delta calculation with configurable lookback (default 3)
   - Plateau signal emission
   - Integration with loop exit policy

### Phase 4: Disagreement Handling (Priority: P2)

1. Implement reviewer disagreement handler in `packages/qfai/src/core/calibration/disagreement.ts`
   - Simple majority rule (interim per SD-0030-001)
   - Tie-breaking: highest-confidence reviewer wins
   - Extensible for future escalation policy (OQ-S30-001)

### Phase 5: Configuration (Priority: P2)

1. Add calibration configuration to `qfai.config.yaml` schema
   - `calibration.packPath`: path to calibration pack
   - `calibration.plateauDelta`: threshold (default configurable)
   - `calibration.plateauLookback`: iterations (default 3)

## Test Strategy

### Integration Tests (L3)

- `tests/integration/calibration/loader.test.ts` → TC-0030-0001, TC-0030-0002
- `tests/integration/calibration/scoring.test.ts` → TC-0030-0003, TC-0030-0004, TC-0030-0005, TC-0030-0006
- `tests/integration/calibration/disagreement.test.ts` → TC-0030-0007, TC-0030-0008
- `tests/integration/calibration/plateau.test.ts` → TC-0030-0009, TC-0030-0010, TC-0030-0011
- `tests/integration/calibration/reload.test.ts` → TC-0030-0012
- `tests/integration/calibration/validation.test.ts` → TC-0030-0013, TC-0030-0014

### E2E Tests (L5)

- `tests/e2e/calibration-pack.test.ts` → US-0030-0001, US-0030-0003, US-0030-0005

### Test Annotations

- Integration: `QFAI:SPEC-0030:TC-XXXX`
- E2E: `QFAI:SPEC-0030:US-XXXX`

## Dependencies

- None (leaf module, consumed by spec-0031)

## Risk Mitigation

- Calibration drift: version-controlled packs with schema validation
- Plateau false positives: configurable delta threshold with sensible defaults

## v1.7.6 Remediation: 3-Layer Calibration Pack Alignment (Phase 6)

### Scope

- DR-0080 / REQ-0004-CAL: Align calibration pack schema with 3-layer model.
- US-0030-0006 / AC-0030-0011..AC-0030-0016 / BR-0030-0016..BR-0030-0021 / TC-0030-0017..TC-0030-0022

### Phase 6: 3-Layer Calibration Schema (Priority: P1)

1. Update `CalibrationPack` schema in `packages/qfai/src/core/calibration/types.ts`
   - Replace ad-hoc dimension keys with 3-layer keys: `invariant`, `trendDerived`, `productSpecific`
   - Make `productSpecific` optional; absent section defaults to "generic" built-in threshold with notice
   - Add validation rule: reject any dimension key not in the 3-layer set (BR-0030-0016, BR-0030-0017)

2. Update `calibration loader` in `packages/qfai/src/core/calibration/loader.ts`
   - Enforce 3-layer schema at load time with descriptive error + migration guidance on failure
   - Apply generic default for absent `productSpecific` section; emit notice (BR-0030-0018)

3. Add `calibration migration utility` in `packages/qfai/src/core/calibration/migrate.ts`
   - Map legacy 4-axis values to 3-layer dimensions without data loss (BR-0030-0020)

4. Add traceability gate for threshold changes
   - Calibration change submissions without spec delta + DR reference are rejected (BR-0030-0019)

### File Impact (v1.7.6 Remediation)

| File                                                              | Purpose                                                  | Status    |
| ----------------------------------------------------------------- | -------------------------------------------------------- | --------- |
| `packages/qfai/src/core/calibration/types.ts`                    | Update CalibrationPack to 3-layer schema                 | remediate |
| `packages/qfai/src/core/calibration/loader.ts`                   | 3-layer validation, generic default, migration guidance  | remediate |
| `packages/qfai/src/core/calibration/migrate.ts`                  | New: 4-axis to 3-layer migration utility                 | new       |
| `tests/integration/calibration/loader.test.ts`                   | Expand: TC-0030-0017..TC-0030-0022                       | remediate |
