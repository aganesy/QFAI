# test-list.md -- spec-0007

Consolidated from old spec-0005 tests.

| TDD-ID   | TC-Refs      | Layer       | Test file                                           | Selector                             | Status |
| -------- | ------------ | ----------- | --------------------------------------------------- | ------------------------------------ | ------ |
| TDD-0001 | TC-0007-0001 | integration | packages/qfai/tests/core/decisionGuardrails.test.ts | Guardrail detection from all sources | done   |
| TDD-0002 | TC-0007-0002 | integration | packages/qfai/tests/core/decisionGuardrails.test.ts | List output format                   | done   |
| TDD-0003 | TC-0007-0003 | integration | packages/qfai/tests/core/decisionGuardrails.test.ts | Empty list handling                  | done   |
| TDD-0004 | TC-0007-0004 | integration | packages/qfai/tests/core/decisionGuardrails.test.ts | Extract keyword filtering            | done   |
| TDD-0005 | TC-0007-0005 | integration | packages/qfai/tests/core/decisionGuardrails.test.ts | Extract --max limit                  | done   |
| TDD-0006 | TC-0007-0006 | integration | packages/qfai/tests/core/decisionGuardrails.test.ts | Check no violations (exit 0)         | done   |
| TDD-0007 | TC-0007-0007 | integration | packages/qfai/tests/core/decisionGuardrails.test.ts | Check violations detected (exit 1)   | done   |
| TDD-0008 | TC-0007-0008 | unit        | packages/qfai/tests/cli/guardrails.test.ts          | Action missing error (exit 2)        | done   |
| TDD-0009 | TC-0007-0009 | integration | packages/qfai/tests/cli/guardrails.test.ts          | Path read error (exit 2)             | done   |
