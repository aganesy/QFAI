# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                           | Selector                                                      | Status | Evidence |
| -------- | ------------ | ----------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | ------ | -------- |
| TDD-0285 | TC-0012-0285 | unit        | `packages/qfai/tests/skill/prototypingSkillV1716.test.ts`           | `TC-0012-0285`                                                | done   | skill asset guard |
| TDD-0286 | TC-0012-0286 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0286`                                         | done   | delegation validator |
| TDD-0287 | TC-0012-0287 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0287`                                         | done   | executionPlan validator |
| TDD-0288 | TC-0012-0288 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0288`                                         | done   | iteration gate doc assertion |
| TDD-0289 | TC-0012-0289 | unit        | `packages/qfai/tests/skill/prototypingSkillV1716.test.ts`           | `TC-0012-0289`                                                | done   | Step 0 documentation |
| TDD-0290 | TC-0012-0290 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0290`                                         | done   | screenshotDir validator |
| TDD-0291 | TC-0012-0291 | unit        | `packages/qfai/tests/skill/captureScreenshots.test.ts`              | `TC-0012-0291`                                                | done   | capture script fail-closed |
| TDD-0292 | TC-0012-0292 | unit        | `packages/qfai/tests/skill/prototypingSkillV1716.test.ts`           | `TC-0012-0292`                                                | done   | canonical evidence paths |
| TDD-0293 | TC-0012-0293 | unit        | `packages/qfai/tests/skill/prototypingSkillV1716.test.ts`           | `TC-0012-0293`                                                | done   | iteration cycle wording |
| TDD-0294 | TC-0012-0294 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0294`                                         | done   | delegation role acceptance |
| TDD-0295 | TC-0012-0295 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0295`                                         | done   | delegation violation path |
| TDD-0296 | TC-0012-0296 | unit        | `packages/qfai/tests/skill/prototypingSkillV1716.test.ts`           | `TC-0012-0296`                                                | done   | evaluator inputs |
| TDD-0297 | TC-0012-0297 | unit        | `packages/qfai/tests/skill/prototypingSkillV1716.test.ts`           | `TC-0012-0297`                                                | done   | missing input detection |
| TDD-0298 | TC-0012-0298 | unit        | `packages/qfai/tests/skill/prototypingSkillV1716.test.ts`           | `TC-0012-0298`                                                | done   | visual checklist |
| TDD-0299 | TC-0012-0299 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0299`                                         | done   | Lighthouse happy path |
| TDD-0300 | TC-0012-0300 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0300`                                         | done   | Lighthouse missing path |
| TDD-0301 | TC-0012-0301 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0301`                                         | done   | design-system threshold pass |
| TDD-0302 | TC-0012-0302 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0302`                                         | done   | design-system threshold fail |
| TDD-0303 | TC-0012-0303 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0303`                                         | done   | design-system skipped path |
| TDD-0304 | TC-0012-0304 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0304`                                         | done   | calibration override application |
| TDD-0305 | TC-0012-0305 | integration | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` | `TC-0012-0305`                                         | done   | calibration default preservation |

## Notes

- This ledger intentionally tracks the currently extant post-runtime-removal tests.
- Historical runtime-specific files removed from `packages/qfai/tests/**` are no longer listed.
