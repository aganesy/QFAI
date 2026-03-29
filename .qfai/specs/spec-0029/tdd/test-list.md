# TDD Execution Ledger — spec-0029 (External Critique Adapter)

| TDD-ID   | TC-Refs      | Layer | Test file                                                  | Selector                                      | Status | DR-ID | Evidence |
| -------- | ------------ | ----- | ---------------------------------------------------------- | --------------------------------------------- | ------ | ----- | -------- |
| TDD-0001 | TC-0029-0001 | L3    | tests/core/critique/critiqueAdapter.test.ts                | CritiqueAdapter > interface contract           | done   |       | RED: module not found → FAIL; GREEN: 1 passed |
| TDD-0002 | TC-0029-0002 | L3    | tests/core/critique/critiqueAdapter.test.ts                | CritiqueAdapter > schema validation fail-open  | done   |       | RED: no test → FAIL; GREEN: returns failOpen=true, reason=invalid_response |
| TDD-0003 | TC-0029-0003 | L3    | tests/core/critique/genericCommandProvider.test.ts         | GenericCommandProvider > command sanitization   | done   |       | RED: module not found → FAIL; GREEN: metacharacters stripped |
| TDD-0004 | TC-0029-0004 | L3    | tests/core/critique/critiqueAdapter.test.ts                | CritiqueAdapter > error handling fail-open     | done   |       | RED: no test → FAIL; GREEN: returns failOpen=true on ECONNREFUSED |
| TDD-0005 | TC-0029-0005 | L3    | tests/core/critique/genericCommandProvider.test.ts         | GenericCommandProvider > timeout enforcement    | done   |       | RED: module not found → FAIL; GREEN: aborts at 500ms, failOpen=true |
| TDD-0006 | TC-0029-0006 | L3    | tests/core/critique/exampleProviders.test.ts               | ExampleProviders > distribution check          | done   |       | RED: module not found → FAIL; GREEN: 2 providers, valid interface |
| TDD-0007 | TC-0029-0007 | L3    | tests/core/critique/critiqueAdapter.test.ts                | CritiqueAdapter > state transition             | done   |       | RED: no test → FAIL; GREEN: fail-open at iter 4, recovery at iter 5 |
| TDD-0008 | TC-0029-0008 | L3    | tests/core/critique/critiqueAdapter.test.ts                | CritiqueAdapter > fail-open logging            | done   |       | RED: no test → FAIL; GREEN: log contains provider, reason, iteration |
