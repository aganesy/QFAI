# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                                  | Selector                                             | Status | DR-ID        | Evidence                               |
| -------- | ------------ | ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------ | ------------ | -------------------------------------- |
| TDD-0001 | TC-0002-0001 | integration | packages/qfai/tests/assets/uiuxSidecar.test.ts                             | exploration-first sidecar family を配布する          | done   | DR-0002-0001 | current asset test pass                |
| TDD-0002 | TC-0002-0002 | integration | packages/qfai/tests/core/discussionDesignHardening.test.ts                 | 必須 exploration sidecar が揃っていれば issue なし   | done   | DR-0002-0001 | current validator unit test pass       |
| TDD-0003 | TC-0002-0003 | integration | packages/qfai/tests/core/discussionDesignHardening.test.ts                 | 必須 sidecar 欠落で missing error                    | done   | DR-0002-0001 | current validator unit test pass       |
| TDD-0004 | TC-0002-0004 | integration | packages/qfai/tests/core/discussionDesignHardening.test.ts                 | brief/rubric/calibration の必須 heading              | done   | DR-0002-0001 | current validator unit test pass       |
| TDD-0005 | TC-0002-0005 | integration | packages/qfai/tests/core/discussionDesignHardening.test.ts                 | anti-goals 箇条書きと best-of-history                | done   | DR-0002-0001 | current validator unit test pass       |
| TDD-0006 | TC-0002-0006 | integration | packages/qfai/tests/integration/discussionHardeningIntegration.test.ts     | 最新 pack に exploration family が揃っていれば pass  | done   | DR-0002-0001 | current integration test pass          |
| TDD-0007 | TC-0002-0007 | integration | packages/qfai/tests/integration/discussionHardeningIntegration.test.ts     | latest pack に欠落や不完全 heading があれば fail     | done   | DR-0002-0001 | current integration test pass          |
| TDD-0008 | TC-0002-0008 | integration | packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts | UI-bearing completion が exploration artifact を要求 | done   | DR-0002-0001 | current template integration test pass |
| TDD-0009 | TC-0002-0009 | integration | packages/qfai/tests/e2e/discussionHardeningE2E.test.ts                     | SKILL.md が exploration-first artifact family を説明 | done   | DR-0002-0001 | current e2e guidance test pass         |
| TDD-0010 | TC-0002-0009 | integration | packages/qfai/tests/core/sddPreflight.test.ts                              | prototyping.yaml 不在が readiness blocker ではない   | done   | DR-0002-0001 | current preflight unit test pass       |
| TDD-0011 | TC-0002-0010 | validators  | packages/qfai/tests/validators/uix/threeLayer.test.ts                      | new format pass                                      | done   | DR-0002-0001 | current three-layer validator pass     |
| TDD-0012 | TC-0002-0011 | validators  | packages/qfai/tests/validators/uix/threeLayer.test.ts                      | legacy 4-axis format is error                        | done   | DR-0002-0001 | current three-layer validator pass     |

## Notes

- Deleted legacy tests and optional side-artifact blockers are removed from the active ledger because current readiness is markdown-first and exploration-first.
