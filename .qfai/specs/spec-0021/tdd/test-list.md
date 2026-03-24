# test-list.md — spec-0021 (Render Critique Loop)

| TDD-ID   | TC-Refs                    | Layer       | Test file                                       | Selector                               | Status | DR-ID | Evidence                                                    |
| -------- | -------------------------- | ----------- | ----------------------------------------------- | -------------------------------------- | ------ | ----- | ----------------------------------------------------------- |
| TDD-0001 | TC-0021-0003, TC-0021-0005 | Unit        | packages/qfai/tests/core/renderCritique.test.ts | code-only rejection + DDP missing halt | done   |       | RED: tests fail (no QFAI-CRIT validator); GREEN: pass 23/23 |
| TDD-0002 | TC-0021-0001, TC-0021-0002 | Integration | packages/qfai/tests/core/renderCritique.test.ts | desktop + mobile critique execution    | done   |       | RED: tests fail; GREEN: pass 23/23                          |
| TDD-0003 | TC-0021-0004               | Integration | packages/qfai/tests/core/renderCritique.test.ts | downstream read order verification     | done   |       | RED: tests fail; GREEN: pass 23/23                          |
| TDD-0004 | TC-0021-0006, TC-0021-0007 | Integration | packages/qfai/tests/core/renderCritique.test.ts | evidence recording + reproducibility   | done   |       | RED: tests fail; GREEN: pass 23/23                          |
| TDD-0005 | TC-0021-0008               | Integration | packages/qfai/tests/core/renderCritique.test.ts | iterative improvement loop completion  | done   |       | RED: tests fail; GREEN: pass 23/23                          |
| TDD-0006 | TC-0021-0009, TC-0021-0010 | Integration | packages/qfai/tests/core/renderCritique.test.ts | taskFidelity PASS and REVISE judgment  | done   |       | RED: tests fail; GREEN: pass 23/23                          |
