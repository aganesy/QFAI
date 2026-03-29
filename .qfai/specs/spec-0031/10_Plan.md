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

---

## [v1.7.7 Remediation] Implementation Plan

Source: discussion-20260329195516830, DR-0083, DR-0084, DR-0085

### Phase R1: Skill Registration and SKILL.md Authoring (Priority: P0)

Addresses US-0031-0007, US-0031-0008, US-0031-0009; REQ-0002, REQ-0003

| File | Change |
| ---- | ------ |
| `.qfai/assistant/skills/qfai-prototyping-full-harness/SKILL.md` | Create or update. Must include: (1) evidence policy section (iteration history, scoring trace, decision log, termination-reason reporting, reviewer expectations), (2) mode context section (positions full-harness as third tier in low-cost/standard/full-harness, cross-references /qfai-prototyping). |
| `.qfai/assistant/skills/` skill registry | Register `/qfai-prototyping-full-harness` as a named skill if not already registered. Confirm `qfai validate` recognizes the registration. |

### Phase R2: Routing Reception Validation (Priority: P0)

Addresses US-0031-0010, AC-0031-0016, BR-0031-0024

| File | Change |
| ---- | ------ |
| `packages/qfai/src/core/harness/loop.ts` or skill entrypoint | Confirm initialization accepts spec inputs without any routing-context artifact. Add test to verify direct and routed invocations produce identical initialization behavior. |

### Phase R3: Auto-Activation Prohibition (Priority: P1)

Addresses BR-0031-0025, AC-0031-0013

| File | Change |
| ---- | ------ |
| `packages/qfai/src/cli/index.ts` or config parser | Confirm no configuration key or environment variable can activate `/qfai-prototyping-full-harness`. Add validation that rejects unsupported config keys with actionable error. |

### Phase R4: Tests for Remediation Items (Priority: P0)

| Test File | Annotations | Scope |
| --------- | ----------- | ----- |
| `tests/integration/harness/skillRegistration.test.ts` | QFAI:SPEC-0031:TC-0031-0031 | Skill registry contains /qfai-prototyping-full-harness; SKILL.md present |
| `tests/integration/harness/skillRegistration.test.ts` | QFAI:SPEC-0031:TC-0031-0032 | --full-harness flag on standard skill does not activate full-harness |
| `tests/integration/harness/skillMd.test.ts` | QFAI:SPEC-0031:TC-0031-0033, TC-0031-0034 | SKILL.md evidence policy section present; missing policy fails validate |
| `tests/integration/harness/skillMd.test.ts` | QFAI:SPEC-0031:TC-0031-0035, TC-0031-0036 | SKILL.md mode context section present; missing mode context fails validate |
| `tests/integration/harness/routingReception.test.ts` | QFAI:SPEC-0031:TC-0031-0037, TC-0031-0038 | Routing reception stateless; direct invocation parity |
| `tests/e2e/full-harness-registration.test.ts` | QFAI:SPEC-0031:US-0031-0007 | End-to-end: /qfai-prototyping-full-harness skill is discoverable and invocable |
| `tests/e2e/full-harness-registration.test.ts` | QFAI:SPEC-0031:TC-0031-0039, TC-0031-0040 | Auto-activation prohibition: config file and env var |

### Remediation Risk Mitigation

| Risk | Mitigation |
| ---- | ---------- |
| SKILL.md required sections not validated by qfai validate | Add SKILL.md schema validation to qfai validate; check for evidence policy and mode context section headings |
| Routing context artifact created by future standard skill change | BR-0031-0024 must be enforced in loop.ts init: only accept spec inputs; assert no routing state param |
| Three-mode cross-reference becomes stale if spec-0006 mode names change | Mode names (low-cost, standard, full-harness) are canonical in spec-0006 01_Spec.md; any change must trigger spec-0031 SKILL.md update |
