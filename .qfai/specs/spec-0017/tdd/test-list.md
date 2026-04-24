# TDD Execution Ledger — spec-0017

| TDD-ID   | TC-Refs      | Layer       | Test file                                                                | Selector     | Status | DR-ID | Evidence                                             |
| -------- | ------------ | ----------- | ------------------------------------------------------------------------ | ------------ | ------ | ----- | ---------------------------------------------------- |
| TDD-0001 | TC-0017-0001 | unit        | packages/qfai/tests/core/prototypingMode.test.ts                         | TC-0017-0001 | done   | —     | Mode obligations identical except maxCycles         |
| TDD-0002 | TC-0017-0002 | unit        | packages/qfai/tests/core/config.test.ts                                  | TC-0017-0002 | done   | —     | Legacy browserProvider rejection                    |
| TDD-0003 | TC-0017-0003 | unit        | packages/qfai/tests/core/config.test.ts                                  | TC-0017-0003 | done   | —     | Legacy renderProvider rejection                     |
| TDD-0004 | TC-0017-0004 | unit        | packages/qfai/tests/core/config.test.ts                                  | TC-0017-0004 | done   | —     | browserTool: playwright-cli accepted                |
| TDD-0005 | TC-0017-0005 | unit        | packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts           | TC-0017-0005 | done   | —     | Deterministic command plan                           |
| TDD-0006 | TC-0017-0006 | unit        | packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts           | TC-0017-0006 | done   | —     | Canonical command structure                          |
| TDD-0007 | TC-0017-0007 | unit        | packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts           | TC-0017-0007 | done   | —     | Output paths under iterations/<cycle>/              |
| TDD-0008 | TC-0017-0008 | unit        | packages/qfai/tests/core/prototyping/reviewBundle.test.ts                | TC-0017-0008 | done   | —     | Review bundle required fields                        |
| TDD-0009 | TC-0017-0009 | unit        | packages/qfai/tests/core/prototyping/reviewBundle.test.ts                | TC-0017-0009 | done   | —     | Review bundle references command plan                |
| TDD-0010 | TC-0017-0010 | unit        | packages/qfai/tests/core/prototyping/evidenceRecord.test.ts              | TC-0017-0010 | done   | —     | PrototypingCycleEvidence schema round-trip           |
| TDD-0011 | TC-0017-0011 | unit        | packages/qfai/tests/core/prototyping/evidenceRecord.test.ts              | TC-0017-0011 | done   | —     | Canonical latest paths mirror latest cycle          |
| TDD-0012 | TC-0017-0012 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0012 | done   | —     | FullHarnessIteration removal (Phase 7)              |
| TDD-0013 | TC-0017-0013 | unit        | packages/qfai/tests/validators/prototyping/modeInvariant.test.ts         | TC-0017-0013 | done   | —     | modeInvariant emits QFAI-PROT-MODE-001              |
| TDD-0014 | TC-0017-0014 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0014 | done   | —     | uiEvidenceArtifacts error in all modes              |
| TDD-0015 | TC-0017-0015 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0015 | done   | —     | reviewerGate error in all modes                     |
| TDD-0016 | TC-0017-0016 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0016 | done   | —     | executionPlan applies to all modes                  |
| TDD-0017 | TC-0017-0017 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0017 | done   | —     | bestOfHistory missing error                          |
| TDD-0018 | TC-0017-0018 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0018 | done   | —     | breakthrough missing error                           |
| TDD-0019 | TC-0017-0019 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0019 | done   | —     | evidenceRefs placeholder rejected                    |
| TDD-0020 | TC-0017-0020 | unit        | packages/qfai/tests/cli/prototyping.test.ts                              | TC-0017-0020 | done   | —     | qfai prototyping prepare writes artifacts            |
| TDD-0021 | TC-0017-0021 | unit        | packages/qfai/tests/cli/prototyping.test.ts                              | TC-0017-0021 | done   | —     | qfai prototyping prepare exits 0                     |
| TDD-0022 | TC-0017-0022 | unit        | packages/qfai/tests/cli/prototyping.test.ts                              | TC-0017-0022 | done   | —     | qfai prototyping prepare skips screenshots           |
| TDD-0023 | TC-0017-0023 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0023 | done   | —     | No playwright-mcp references in repo                 |
| TDD-0024 | TC-0017-0024 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0024 | done   | —     | No Node Playwright imports in production src        |
| TDD-0025 | TC-0017-0025 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0025 | done   | —     | Skill directories byte-identical                     |
| TDD-0026 | TC-0017-0026 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0026 | done   | —     | capture-screenshots.js deleted                       |
| TDD-0027 | TC-0017-0027 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0027 | done   | —     | E2E all 3 modes pass validate                        |
| TDD-0028 | TC-0017-0028 | unit        | packages/qfai/tests/validators/testTodoStubs.test.ts                     | TC-0017-0028 | done   | —     | it.todo / test.todo / describe.todo detected        |
| TDD-0029 | TC-0017-0029 | unit        | packages/qfai/tests/validators/testTodoStubs.test.ts                     | TC-0017-0029 | done   | —     | forbidTestTodoStubs opt-out works                    |
| TDD-0030 | TC-0017-0030 | unit        | packages/qfai/tests/core/config.test.ts                                  | TC-0017-0030 | done   | —     | forbidTestTodoStubs defaults to true                 |
| TDD-0031 | TC-0017-0031 | unit        | packages/qfai/tests/cli/init.test.ts                                     | TC-0017-0031 | done   | —     | init ships .github/workflows/qfai-validate.yml       |
| TDD-0032 | TC-0017-0032 | integration | packages/qfai/tests/integration/spec0017Integration.test.ts              | TC-0017-0032 | done   | —     | qfai-implement skill gate on QFAI-TEST-0001         |
