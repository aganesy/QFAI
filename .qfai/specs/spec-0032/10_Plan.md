# 10 Plan

## Implementation Strategy

### Phase 1: Metrics Collection (Priority: P1)

1. Implement metrics collector in `packages/qfai/src/core/observability/metrics.ts`
   - Per-iteration metrics: duration, token count, score, decision
   - Aggregate metrics: total duration, total cost, iteration count, final score
   - JSON Lines format for streaming compatibility
   - PII exclusion from metric payloads

### Phase 2: Metrics Output (Priority: P1)

2. Implement metrics writer in `packages/qfai/src/core/observability/writer.ts`
   - File-based output to `.qfai/evidence/metrics/`
   - Local buffering when sink is unavailable
   - 100% emission guarantee for premium runs (NFR-0003)

### Phase 3: Mode Guidance (Priority: P2)

3. Implement mode advisor in `packages/qfai/src/core/observability/guidance.ts`
   - Project characteristic assessment (complexity, scope, quality requirements)
   - Standard vs premium recommendation with rationale
   - Configurable guidance thresholds

### Phase 4: Reviewer Drift (Priority: P2)

4. Implement drift tracker in `packages/qfai/src/core/observability/drift.ts`
   - Cross-run score comparison for same evaluator
   - Drift detection when delta exceeds threshold (default 0.15)
   - Warning emission on drift detection

### Phase 5: Capability Profile (Priority: P2)

5. Implement capability profiler in `packages/qfai/src/core/observability/profile.ts`
   - Project assessment based on available capabilities
   - Premium path readiness check
   - Mode recommendation integration

## Test Strategy

### Integration Tests (L3)

- `tests/integration/observability/metrics.test.ts` -> TC-0032-0001 through TC-0032-0006
- `tests/integration/observability/guidance.test.ts` -> TC-0032-0007, TC-0032-0008, TC-0032-0009
- `tests/integration/observability/drift.test.ts` -> TC-0032-0010 through TC-0032-0014
- `tests/integration/observability/profile.test.ts` -> TC-0032-0015 through TC-0032-0018

### E2E Tests (L5)

- `tests/e2e/observability-metrics.test.ts` -> US-0001
- `tests/e2e/observability-guidance.test.ts` -> US-0002

### Test Annotations

- Integration: `QFAI:SPEC-0032:TC-XXXX`
- E2E: `QFAI:SPEC-0032:US-XXXX`

## Dependencies

- spec-0031 (full-harness) - metrics emitted from harness loop

## Risk Mitigation

- Metric emission failure: local buffering, fail-open (never block run)
- Drift false positives: configurable threshold with sensible default
