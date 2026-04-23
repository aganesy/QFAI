# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                   | Selector                 | Status | DR-ID        | Evidence                                 |
| -------- | ------------ | ----------- | ----------------------------------------------------------- | ------------------------ | ------ | ------------ | ---------------------------------------- |
| TDD-0001 | TC-0004-0001 | integration | packages/qfai/tests/core/validate.test.ts                   | validateProject          | done   | DR-0004-0001 | current core validate suite pass         |
| TDD-0002 | TC-0004-0002 | integration | packages/qfai/tests/core/validate.test.ts                   | canonical validator path | done   | DR-0004-0001 | current core validate suite pass         |
| TDD-0003 | TC-0004-0003 | validators  | packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts  | missing screenshot       | done   | DR-0004-0003 | current UI evidence validator pass       |
| TDD-0004 | TC-0004-0004 | validators  | packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts  | missing html             | done   | DR-0004-0004 | current UI evidence validator pass       |
| TDD-0005 | TC-0004-0005 | validators  | packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts  | no screen contract skip  | done   | DR-0004-0003 | current UI evidence validator pass       |
| TDD-0006 | TC-0004-0006 | unit        | packages/qfai/tests/skill/prototypingSkill.test.ts          | current skill contract   | done   | DR-0004-0002 | current prototyping skill validator pass |
| TDD-0007 | TC-0004-0007 | validators  | packages/qfai/tests/validators/prototypingDesignSystem.test.ts | legacy slice semantics | done   | DR-0004-0002 | current legacy validator slice pass      |
