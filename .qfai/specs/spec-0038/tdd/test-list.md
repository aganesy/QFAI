# spec-0038 TDD Execution Ledger

## Test List

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TDD-0001 | TC-0038-0016 | Unit | packages/qfai/tests/core/config.test.ts | config baseBranch setting used for diff | done | | RED: `Property 'baseBranch' does not exist` → GREEN: 3/3 pass |
| TDD-0002 | TC-0038-0001 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Source A: git diff origin/main..HEAD detects spec changes | done | | RED: 7 failed (module not found) → GREEN: 7/7 pass |
| TDD-0003 | TC-0038-0002 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Source B: git diff --staged detects spec changes | done | | RED: 3 failed → GREEN: 10/10 pass |
| TDD-0004 | TC-0038-0003 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Source C: stale detection via timestamp | done | | RED: 3 failed → GREEN: 13/13 pass |
| TDD-0005 | TC-0038-0004 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Source D: parse delta.md change record | done | | RED: 3 failed → GREEN: 16/16 pass |
| TDD-0006 | TC-0038-0005 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Union of 4 sources without duplication | done | | RED: 1 failed → GREEN: 23/23 pass |
| TDD-0007 | TC-0038-0006 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Fallback returns all specs when zero diff | done | | RED: 1 failed → GREEN: 23/23 pass |
| TDD-0008 | TC-0038-0007 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Git absent graceful degradation | done | | RED: 1 failed → GREEN: 23/23 pass |
| TDD-0009 | TC-0038-0013 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | --full flag bypasses diff detection | done | | RED: 1 failed → GREEN: 23/23 pass |
| TDD-0010 | TC-0038-0015 | Unit | packages/qfai/tests/core/specDiffDetector.test.ts | Policy change triggers all specs in scope | done | | RED: 2 failed → GREEN: 23/23 pass |
| TDD-0011 | TC-0038-0010 | Unit | packages/qfai/tests/core/traceabilityIntegrity.test.ts | Spec BR changed + impl unchanged = QFAI-TRACE-001 | done | | RED: module not found → GREEN: 6/6 pass |
| TDD-0012 | TC-0038-0011 | Unit | packages/qfai/tests/core/traceabilityIntegrity.test.ts | Spec BR changed + impl changed = PASS | done | | GREEN: 6/6 pass |
| TDD-0013 | TC-0038-0012 | Unit | packages/qfai/tests/core/traceabilityIntegrity.test.ts | Ledger absent = warning + skip | done | | GREEN: 6/6 pass |
| TDD-0014 | TC-0038-0017 | Unit | packages/qfai/tests/core/traceabilityIntegrity.test.ts | Backward compat: evidence without Diff Context | done | | GREEN: 6/6 pass |
| TDD-0015 | TC-0038-0014 | Unit | packages/qfai/tests/core/traceabilityIntegrity.test.ts | Pipeline integration: validateProject includes traceabilityIntegrity | done | | GREEN: 6/6 pass |
| TDD-0016 | TC-0038-0008 | Integration | tests/integration/specDiffDetector.integration.test.ts | Prototyping skill detect diff flow | exception | DR-0038-EX-001 | L3 AI agent flow test — deferred to /qfai-atdd |
| TDD-0017 | TC-0038-0009 | Integration | tests/integration/specDiffDetector.integration.test.ts | Implement skill detect diff flow | exception | DR-0038-EX-001 | L3 AI agent flow test — deferred to /qfai-atdd |
