# 10 Plan

## Implementation Strategy

### Phase 1: Skill Registration (Priority: P1)

1. Register `/qfai-prototyping-full-harness` as a new skill
   - SKILL.md definition with explicit non-default opt-in
   - Skill completion contract and evidence requirements
   - Input validation (spec inputs required before loop starts)

### Phase 2: Planner/Generator/Evaluator Decomposition (Priority: P1)

1. Implement `Planner` in `packages/qfai/src/core/harness/planner.ts`
   - Generation strategy creation from spec inputs
   - Pivot handling (revised plan on evaluator signal)
1. Implement `Generator` in `packages/qfai/src/core/harness/generator.ts`
   - Output generation from plan
   - Refinement handling (incorporate evaluator feedback)
1. Implement `Evaluator` in `packages/qfai/src/core/harness/evaluator.ts`
   - Score output using calibration pack (spec-0030)
   - Request optional critique via adapter (spec-0029)
   - Accept/refine/pivot decision based on thresholds
   - Weighted scoring with dimension floors

### Phase 3: Iteration Loop (Priority: P1)

1. Implement `HarnessLoop` in `packages/qfai/src/core/harness/loop.ts`
   - Configurable iteration range (5-15, default max 15)
   - Plateau detection integration (spec-0030)
   - Loop exit on accept, plateau, or cap
   - Best-so-far tracking for cap-reached output

### Phase 4: Evidence & Review (Priority: P1)

1. Implement evidence generation in `packages/qfai/src/core/harness/evidence.ts`
   - Mandatory evidence for every premium run
   - Iteration history, scores, decisions per iteration
   - Review artifact generation

### Phase 5: Standard Path Isolation (Priority: P1)

1. Verify standard path isolation
   - No imports from harness/ in standard prototyping path
   - Performance benchmark: standard path < 1% regression vs v1.7.5

## Test Strategy

### Integration Tests (L3)

- `tests/integration/harness/planner.test.ts` -> TC-0003
- `tests/integration/harness/generator.test.ts` -> TC-0004
- `tests/integration/harness/evaluator.test.ts` -> TC-0005, TC-0006, TC-0007, TC-0008, TC-0011
- `tests/integration/harness/loop.test.ts` -> TC-0009, TC-0013, TC-0014, TC-0015
- `tests/integration/harness/evidence.test.ts` -> TC-0010
- `tests/integration/harness/scoring.test.ts` -> TC-0016, TC-0017, TC-0018

### E2E Tests (L5)

- `tests/e2e/full-harness-happy.test.ts` -> US-0001
- `tests/e2e/full-harness-loop.test.ts` -> US-0005
- `tests/e2e/full-harness-evidence.test.ts` -> US-0006
- `tests/e2e/standard-path-isolation.test.ts` -> US-0001 (regression)

### Test Annotations

- Integration: `QFAI:SPEC-0031:TC-XXXX`
- E2E: `QFAI:SPEC-0031:US-XXXX`

## Dependencies

- spec-0029 (critique adapter) - evaluator uses CritiqueAdapter
- spec-0030 (calibration pack) - evaluator uses CalibrationPack, scoring, plateau detection

## Risk Mitigation

- Premium path creep: strict module boundary (harness/ not imported by standard path)
- Cost runaway: iteration cap enforcement with configurable maximum
- Long-running corruption: handoff artifacts (spec-0033) for recovery
