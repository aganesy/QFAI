# 10 Plan

## Implementation Strategy

### Phase 1: Handoff Artifact Schema (Priority: P1)

1. Define handoff artifact schema in `packages/qfai/src/core/handoff/types.ts`
   - Session state: planner state, generator state, evaluator history
   - Iteration progress: current iteration, scores, decisions
   - Metadata: session ID, timestamp, version
   - Credential stripping (POL-003)

### Phase 2: Handoff Writer/Reader (Priority: P1)

2. Implement handoff writer in `packages/qfai/src/core/handoff/writer.ts`
   - Write artifact on interruption (SIGINT, SIGTERM, unhandled error)
   - Minimal artifact at iteration 1
   - Credential scanning and stripping
3. Implement handoff reader in `packages/qfai/src/core/handoff/reader.ts`
   - Load and validate artifact
   - Corruption detection with fresh-start fallback
   - Portable (no user lock, any user can resume)

### Phase 3: Display-Only Detection (Priority: P1)

4. Implement display detector in `packages/qfai/src/core/detection/display.ts`
   - Heuristic-based (not AST) per DR-0076
   - Configurable sensitivity threshold
   - Returns flagged locations with confidence scores

### Phase 4: Stub-Only Detection (Priority: P1)

5. Implement stub detector in `packages/qfai/src/core/detection/stub.ts`
   - Heuristic patterns: TODO, NotImplemented, throw new Error, pass, empty methods
   - Partial stub detection (mixed real + stub)
   - Specific location reporting for partial stubs
   - Triggers refine decision in evaluator

### Phase 5: Integration (Priority: P2)

6. Integrate with harness loop (spec-0031)
   - Handoff: register signal handlers at loop start, cleanup on normal completion
   - Detection: run after each generator output, feed results to evaluator

## Test Strategy

### Integration Tests (L3)

- `tests/integration/handoff/writer.test.ts` -> TC-0033-0001, TC-0033-0002, TC-0033-0005
- `tests/integration/handoff/reader.test.ts` -> TC-0033-0003, TC-0033-0004, TC-0033-0006
- `tests/integration/handoff/credentials.test.ts` -> TC-0033-0007
- `tests/integration/detection/display.test.ts` -> TC-0033-0008, TC-0033-0009
- `tests/integration/detection/stub.test.ts` -> TC-0033-0010, TC-0033-0011, TC-0033-0012
- `tests/integration/detection/idempotent.test.ts` -> TC-0033-0013, TC-0033-0014

### E2E Tests (L5)

- `tests/e2e/handoff-resume.test.ts` -> US-0001, US-0002
- `tests/e2e/detection-flagging.test.ts` -> US-0003, US-0004, US-0005

### Test Annotations

- Integration: `QFAI:SPEC-0033:TC-XXXX`
- E2E: `QFAI:SPEC-0033:US-XXXX`

## Dependencies

- spec-0031 (full-harness) - handoff integrated into harness loop, detection feeds evaluator

## Risk Mitigation

- Handoff corruption: checksum validation, graceful fallback to fresh start
- Detection false positives: configurable sensitivity, heuristic-only approach
- Credential leakage: explicit scanning and stripping before write
