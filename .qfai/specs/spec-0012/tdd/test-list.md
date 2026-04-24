# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                                | Selector     | Status | DR-ID        | Evidence                         |
| -------- | ------------ | ----------- | ------------------------------------------------------------------------ | ------------ | ------ | ------------ | -------------------------------- |
| TDD-0285 | TC-0012-0285 | unit        | packages/qfai/tests/skill/prototypingSkillV1716.test.ts                  | TC-0012-0285 | done   | DR-0012-0001 | skill asset guard                |
| TDD-0286 | TC-0012-0286 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0286 | done   | DR-0012-0001 | delegation validator             |
| TDD-0287 | TC-0012-0287 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0287 | done   | DR-0012-0004 | executionPlan validator          |
| TDD-0288 | TC-0012-0288 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0288 | done   | DR-0012-0002 | iteration gate doc assertion     |
| TDD-0289 | TC-0012-0289 | unit        | packages/qfai/tests/skill/prototypingSkillV1716.test.ts                  | TC-0012-0289 | done   | DR-0012-0002 | Step 0 documentation             |
| TDD-0290 | TC-0012-0290 | unit        | packages/qfai/tests/skill/prototypingSkillV1716.test.ts                  | TC-0012-0290 | done   | DR-0012-0003 | canonical evidence paths         |
| TDD-0291 | TC-0012-0291 | unit        | packages/qfai/tests/skill/captureScreenshots.test.ts                     | TC-0012-0291 | done   | DR-0012-0003 | capture script fail-closed       |
| TDD-0292 | TC-0012-0292 | unit        | packages/qfai/tests/skill/prototypingSkillV1716.test.ts                  | TC-0012-0292 | done   | DR-0012-0002 | iteration cycle wording          |
| TDD-0293 | TC-0012-0293 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0293 | done   | DR-0012-0001 | delegation violation path        |
| TDD-0294 | TC-0012-0294 | unit        | packages/qfai/tests/skill/prototypingSkill.test.ts                       | TC-0012-0294 | done   | DR-0012-0002 | evaluator inputs                 |
| TDD-0295 | TC-0012-0295 | unit        | packages/qfai/tests/skill/prototypingSkill.test.ts                       | TC-0012-0295 | done   | DR-0012-0002 | missing input detection          |
| TDD-0296 | TC-0012-0296 | unit        | packages/qfai/tests/skill/prototypingSkillV1716.test.ts                  | TC-0012-0296 | done   | DR-0012-0002 | visual checklist                 |
| TDD-0297 | TC-0012-0297 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0297 | done   | DR-0012-0004 | Lighthouse happy path            |
| TDD-0298 | TC-0012-0298 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0298 | done   | DR-0012-0004 | Lighthouse missing path          |
| TDD-0299 | TC-0012-0299 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0299 | done   | DR-0012-0004 | design-system threshold pass     |
| TDD-0300 | TC-0012-0300 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0300 | done   | DR-0012-0004 | design-system threshold fail     |
| TDD-0301 | TC-0012-0301 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0301 | done   | DR-0012-0004 | design-system skipped path       |
| TDD-0302 | TC-0012-0302 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0302 | done   | DR-0012-0004 | calibration override application |
| TDD-0303 | TC-0012-0303 | integration | packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts | TC-0012-0303 | done   | DR-0012-0004 | calibration default preservation |
| TDD-0304 | TC-0012-0304 | unit        | packages/qfai/tests/core/harness/history.test.ts                         | TC-0012-0304 | done   | DR-0012-0006 | reviewerScores iteration schema  |
| TDD-0305 | TC-0012-0305 | unit        | packages/qfai/tests/core/harness/history.test.ts                         | TC-0012-0305 | done   | DR-0012-0007 | scoringTrace snapshot            |
| TDD-0306 | TC-0012-0306 | unit        | packages/qfai/tests/core/harness/evidence.test.ts                        | TC-0012-0306 | done   | DR-0012-0006 | history consistency              |
| TDD-0307 | TC-0012-0307 | unit        | packages/qfai/tests/core/harness/resultWriter.test.ts                    | TC-0012-0307 | done   | DR-0012-0008 | iterationBudget output           |
| TDD-0308 | TC-0012-0308 | unit        | packages/qfai/tests/core/prototypingMode.test.ts                         | TC-0012-0308 | done   | DR-0012-0008 | max iteration budget mapping     |
| TDD-0309 | TC-0012-0309 | unit        | packages/qfai/tests/core/harness/history.test.ts                         | TC-0012-0309 | done   | DR-0012-0008 | termination semantics            |
| TDD-0314 | TC-0012-0314 | unit        | packages/qfai/tests/core/validate.test.ts                                | TC-0012-0314 | done   | DR-0012-0009 | perfect-100 validator fail path  |
| TDD-0315 | TC-0012-0315 | unit        | packages/qfai/tests/core/validate.test.ts                                | TC-0012-0315 | done   | DR-0012-0009 | perfect-100 validator pass path  |
| TDD-0316 | TC-0012-0316 | unit        | packages/qfai/tests/core/validate.test.ts                                | TC-0012-0316 | done   | DR-0012-0009 | completion certificate gate      |

## Notes

- This ledger intentionally tracks the currently extant post-runtime-removal tests and the current reviewer-score harness coverage.
- New completion entries use implementation-as-SSOT evidence and replace the previous 95-point completion border with perfect-100 semantics.
- Historical runtime-specific files removed from `packages/qfai/tests/**` are no longer listed.
