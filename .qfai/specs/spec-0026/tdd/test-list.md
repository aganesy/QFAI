# test-list.md — spec-0026 (Discussion/UIUX Authoring Foundation)

## Execution Ledger

| TDD-ID   | TC-Refs      | Layer | Test file                                      | Selector                                            | Status    | DR-ID        | Evidence                                    |
| -------- | ------------ | ----- | ---------------------------------------------- | --------------------------------------------------- | --------- | ------------ | ------------------------------------------- |
| TDD-0001 | TC-0026-0001 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | 11 sidecar files present in uiux/                   | done      |              | RED: [] (no dir) → GREEN: 23 tests pass     |
| TDD-0002 | TC-0026-0002 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | strategy YAML schema conformance                    | done      |              | RED: [] (no dir) → GREEN: 23 tests pass     |
| TDD-0003 | TC-0026-0023 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | strategy minimal-but-complete verbosity             | done      |              | RED: [] (no dir) → GREEN: 23 tests pass     |
| TDD-0004 | TC-0026-0020 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | eval axis usability has criteria and measurement    | done      |              | RED: [] (no dir) → GREEN: 23 tests pass     |
| TDD-0005 | TC-0026-0021 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | comparison template 2+ options against axes         | done      |              | RED: [] (no dir) → GREEN: 23 tests pass     |
| TDD-0006 | TC-0026-0022 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | contracts template anchor screen interactions       | done      |              | RED: [] (no dir) → GREEN: 23 tests pass     |
| TDD-0007 | TC-0026-0007 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | SKILL.md detection section 5 surface categories     | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0008 | TC-0026-0004 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | surface classification web-ui documented            | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0009 | TC-0026-0005 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | surface classification non-ui documented            | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0010 | TC-0026-0006 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | surface classification edge case documented         | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0011 | TC-0026-0008 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | UI-bearing completion conditions 4 required         | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0012 | TC-0026-0010 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | non-UI completion conditions unchanged              | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0013 | TC-0026-0011 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | 03 behavior obligations primary not HTML mock       | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0014 | TC-0026-0024 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | 03 HTML/CSS mock fallback demotion                  | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0015 | TC-0026-0012 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | 04 registry with adopted/rejected/local_translation | done      |              | RED: already present → GREEN: 23 tests pass |
| TDD-0016 | TC-0026-0013 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | 04 registry empty no schema violation               | done      |              | RED: already present → GREEN: 23 tests pass |
| TDD-0017 | TC-0026-0014 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | 14 sidecar review scope section present             | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0018 | TC-0026-0015 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | core templates UX-INTENT cross-refs present         | done      |              | RED: 0 UX-INTENT → GREEN: 23 tests pass     |
| TDD-0019 | TC-0026-0016 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | cross-ref graceful degradation no broken links      | done      |              | RED: 0 comments → GREEN: 23 tests pass      |
| TDD-0020 | TC-0026-0017 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | partial sidecar cross-refs                          | done      |              | RED: no uiux/ refs → GREEN: 23 tests pass   |
| TDD-0021 | TC-0026-0018 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | init distributes uiux sidecar templates             | done      |              | RED: 0 files → GREEN: 23 tests pass         |
| TDD-0022 | TC-0026-0019 | Unit  | packages/qfai/tests/assets/assets.test.ts      | verify-pack all assets pass after v1.7.3            | done      |              | GREEN: 711 tests pass (full suite)          |
| TDD-0023 | TC-0026-0003 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | SKILL.md non-UI skip documented                     | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0024 | TC-0026-0009 | Unit  | packages/qfai/tests/assets/uiuxSidecar.test.ts | SKILL.md incomplete condition blocking documented   | done      |              | RED: no section → GREEN: 23 tests pass      |
| TDD-0025 | TC-0026-0025 | CI    | (CI matrix)                                    | idempotency non-UI                                  | exception | DR-LOCAL-001 | CI matrix — requires LLM execution          |
| TDD-0026 | TC-0026-0026 | CI    | (CI matrix)                                    | idempotency UI-bearing                              | exception | DR-LOCAL-001 | CI matrix — requires LLM execution          |
| TDD-0027 | TC-0026-0027 | CI    | (CI matrix)                                    | partial write prevention                            | exception | DR-LOCAL-002 | CI matrix — requires IO error simulation    |
