# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                      | Selector                 | Status    | DR-ID        | Evidence                                 |
| -------- | ------------ | ----------- | -------------------------------------------------------------- | ------------------------ | --------- | ------------ | ---------------------------------------- |
| TDD-0001 | TC-0004-0001 | integration | packages/qfai/tests/core/validate.test.ts                      | validateProject          | exception | DR-0004-0001 | current core validate suite pass         |
| TDD-0002 | TC-0004-0002 | integration | packages/qfai/tests/core/validate.test.ts                      | canonical validator path | exception | DR-0004-0001 | current core validate suite pass         |
| TDD-0003 | TC-0004-0003 | validators  | packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts     | missing screenshot       | done      | DR-0004-0003 | current UI evidence validator pass       |
| TDD-0004 | TC-0004-0004 | validators  | packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts     | missing html             | done      | DR-0004-0004 | current UI evidence validator pass       |
| TDD-0005 | TC-0004-0005 | validators  | packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts     | no screen contract skip  | done      | DR-0004-0003 | current UI evidence validator pass       |
| TDD-0006 | TC-0004-0006 | unit        | packages/qfai/tests/skill/prototypingSkill.test.ts             | current skill contract   | done      | DR-0004-0002 | current prototyping skill validator pass |
| TDD-0007 | TC-0004-0007 | validators  | packages/qfai/tests/validators/prototypingDesignSystem.test.ts | legacy slice semantics   | exception | DR-0004-0002 | current legacy validator slice pass      |
| TDD-0008 | TC-0004-0008 | validators  | packages/qfai/tests/core/validators/designContractReadiness.test.ts | QFAI-DCON-030 | done | (none) | DCON-030 DESIGN.md presence gate |
| TDD-0009 | TC-0004-0009 | validators  | packages/qfai/tests/core/validators/designContractReadiness.test.ts | QFAI-DCON-031 | done | (none) | DCON-031 lock hash integrity gate |
| TDD-0010 | TC-0004-0010 | validators  | packages/qfai/tests/core/validators/designContractReadiness.test.ts | QFAI-DCON-032 | done | (none) | DCON-032 design-system mirror gate |
| TDD-0011 | TC-0004-0011 | validators  | packages/qfai/tests/core/prototypingEvidence.negative.test.ts | QFAI-PROT-002 schema-v3 | done | (none) | review.json schema (4 UX axes / prose / pivotDirective) |
| TDD-0012 | TC-0004-0012 | validators  | packages/qfai/tests/core/prototypingEvidence.negative.test.ts | QFAI-PROT-002 lap-whitelist | done | (none) | layoutAntiPatternsDetected whitelist |
| TDD-0013 | TC-0004-0013 | validators  | packages/qfai/tests/core/prototypingEvidence.negative.test.ts | QFAI-PROT-002 shape | done | (none) | designMdViolations shape |
| TDD-0014 | TC-0004-0014 | unit        | packages/qfai/tests/core/prototyping/designMdViolations.test.ts | findDesignMdViolations purity | done | (none) | findDesignMdViolations purity / determinism |
