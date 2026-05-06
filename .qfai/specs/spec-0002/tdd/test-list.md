# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                                  | Selector                                             | Status | DR-ID        | Evidence                               |
| -------- | ------------ | ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------ | ------------ | -------------------------------------- |
| TDD-0001 | TC-0002-0001 | integration | packages/qfai/tests/assets/uiuxSidecar.test.ts                             | exploration-first sidecar family を配布する          | done   | DR-0002-0001 | current asset test pass                |
| TDD-0008 | TC-0002-0008 | integration | packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts | UI-bearing completion が exploration artifact を要求 | done   | DR-0002-0001 | current template integration test pass |
| TDD-0009 | TC-0002-0009 | integration | packages/qfai/tests/e2e/discussionHardeningE2E.test.ts                     | SKILL.md が exploration-first artifact family を説明 | done   | DR-0002-0001 | current e2e guidance test pass         |
| TDD-0010 | TC-0002-0009 | integration | packages/qfai/tests/core/sddPreflight.test.ts                              | prototyping.yaml 不在が readiness blocker ではない   | done   | DR-0002-0001 | current preflight unit test pass       |
| TDD-0011 | TC-0002-0010 | validators  | packages/qfai/tests/validators/uix/threeLayer.test.ts                      | new format pass                                      | done   | DR-0002-0001 | current three-layer validator pass     |
| TDD-0012 | TC-0002-0011 | validators  | packages/qfai/tests/validators/uix/threeLayer.test.ts                      | legacy 4-axis format is error                        | done   | DR-0002-0001 | current three-layer validator pass     |

## Notes

- Deleted legacy tests and optional side-artifact blockers are removed from the active ledger because current readiness is markdown-first and exploration-first.
- v1.8.9: the legacy `discussionDesignHardening` validator and its proving tests were retired together with the exploration-sidecar family. The corresponding TDD-0002..0007 rows referenced deleted test files and are removed from this active ledger; their TC-0002-0002..0007 spec entries are now superseded by DESIGN.md-driven equivalents in the post-1.8.9 prototyping spec.
