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

3. Implement scoring engine in `packages/qfai/src/core/calibration/scoring.ts`
   - Apply scoring alignment to evaluator output
   - Weighted dimension scoring
   - Accept/refine/pivot decision based on thresholds

### Phase 3: Plateau Detection (Priority: P1)

4. Implement plateau detection in `packages/qfai/src/core/calibration/plateau.ts`
   - Score delta calculation with configurable lookback (default 3)
   - Plateau signal emission
   - Integration with loop exit policy

### Phase 4: Disagreement Handling (Priority: P2)

5. Implement reviewer disagreement handler in `packages/qfai/src/core/calibration/disagreement.ts`
   - Simple majority rule (interim per SD-0030-001)
   - Tie-breaking: highest-confidence reviewer wins
   - Extensible for future escalation policy (OQ-S30-001)

### Phase 5: Configuration (Priority: P2)

6. Add calibration configuration to `qfai.config.yaml` schema
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
