# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                                  | Selector                                             | Status | DR-ID        | Evidence                                 |
| -------- | ------------ | ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------ | ------------ | ---------------------------------------- |
| TDD-0001 | TC-0010-0001 | integration | packages/qfai/tests/assets/uiuxSidecar.test.ts                             | exploration-first sidecar family を配布する          | done   | DR-0010-0002 | current asset test pass                  |
| TDD-0002 | TC-0010-0002 | integration | packages/qfai/tests/assets/uiuxSidecar.test.ts                             | 30_exploration_brief.md が探索条件を定義している     | done   | DR-0010-0002 | current asset test pass                  |
| TDD-0003 | TC-0010-0003 | integration | packages/qfai/tests/assets/uiuxSidecar.test.ts                             | 33_exploration_rubric.md が rubric を持つ            | done   | DR-0010-0002 | current asset test pass                  |
| TDD-0004 | TC-0010-0004 | integration | packages/qfai/tests/assets/uiuxSidecar.test.ts                             | 34_evaluator_calibration.md が calibration 例を持つ  | done   | DR-0010-0004 | current asset test pass                  |
| TDD-0005 | TC-0010-0005 | integration | packages/qfai/tests/assets/uiuxSidecar.test.ts                             | 50_review_input_bundle.md が best-of-history を明記  | done   | DR-0010-0004 | current asset test pass                  |
| TDD-0006 | TC-0010-0006 | integration | packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts | uiux template directory が exploration family を持つ | done   | DR-0010-0002 | current integration test pass            |
| TDD-0007 | TC-0010-0006 | integration | packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts | SKILL.md が exploration artifact completion を要求   | done   | DR-0010-0001 | current integration test pass            |
| TDD-0008 | TC-0010-0006 | integration | packages/qfai/tests/e2e/discussionHardeningE2E.test.ts                     | planner / exploration brief 中心の guidance          | done   | DR-0010-0001 | current e2e guidance test pass           |
| TDD-0009 | TC-0010-0002 | integration | packages/qfai/tests/core/discussionDesignHardening.test.ts                 | required exploration sidecar completeness            | done   | DR-0010-0002 | current validator unit test pass         |
| TDD-0010 | TC-0010-0006 | integration | packages/qfai/tests/core/discussionDesignHardening.integration.test.ts     | init 後 skill/template が exploration-first wording   | done   | DR-0010-0001 | current validator integration smoke pass |

## Notes

- Legacy rows tied to discussion-time design-system generation and deleted v1.7.16-specific test files were removed because they no longer represent current executable coverage.
