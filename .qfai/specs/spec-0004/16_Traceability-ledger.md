# 16 Traceability Ledger

| Requirement | Implementation File                                                                                                 | Test File                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| REQ-0013    | `packages/qfai/src/core/validate.ts`                                                                                | `packages/qfai/tests/core/validate.test.ts`                                                  |
| REQ-0014    | `packages/qfai/src/core/validators/skill/prototypingSkill.ts`                                                       | `packages/qfai/tests/skill/prototypingSkill.test.ts`                                         |
| REQ-0015    | `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`                                                          | `packages/qfai/tests/core/validate.test.ts`                                                  |
| REQ-0020    | `packages/qfai/src/core/validators/prototypingEvidence.ts`                                                          | `packages/qfai/tests/validators/prototypingEvidence.test.ts`                                 |
| REQ-0120    | `packages/qfai/src/core/validate.ts` (profile-suffixed path emission + always-latest validate.json `profile` field) | `packages/qfai/tests/integration/validateProfilePaths.test.ts` (planned, TC-0004-0055..0058) |
| REQ-0102    | `packages/qfai/scripts/lint-ssot-pair.ts` (planned; pair-changed lane consumed by `pnpm ci:lint`)                   | `packages/qfai/tests/integration/ssotSyncPairLane.test.ts` (planned, TC-0004-0059..0062)     |
| REQ-0125    | `packages/qfai/src/core/validators/reviewerReport.ts` (R-PROMPT-SCANNER-DRIFT justification 3-part validation)      | `packages/qfai/tests/core/reviewerReport.test.ts` (planned, TC-0004-0063..0064)              |
