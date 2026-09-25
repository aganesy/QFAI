# 16 Traceability Ledger

## Purpose

Link each `BR-*` / `AC-*` in this spec to the implementation file that realizes it and
the test file that proves it. `npx qfai validate` compares each obligation with its
merge-base copy. A changed or new obligation needs an active binding in the first table
or an entry in the planned table. An active binding whose implementation did not change
on the branch needs current test proof in its `Proof` column, otherwise
`QFAI-TRACE-001` (severity `error`) fires.

## Ledger Table (required when this file exists)

| BR/AC        | Implementation File                                        | Test File                                                                    | Notes                                                                           | Proof |
| ------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----- |
| AC-0004-0018 | packages/qfai/src/core/validators/reviewerJustification.ts | packages/qfai/tests/validators/reviewerRejectedReadopt.test.ts               | `R-REJECTED-READOPT` is the remaining justification-gated code.                 | -     |
| AC-0004-0040 | packages/qfai/src/core/validate.ts                         | packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts        | Validate no longer composes a work-log validator.                               | -     |
| AC-0004-0040 | packages/qfai/src/cli/commands/validate.ts                 | packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts        | The profile code lists no work-log code.                                        | -     |
| AC-0004-0040 | packages/qfai/src/core/governedAssistantManifest.ts        | packages/qfai/tests/integration/spec0004WithdrawnSchemaFinding.test.ts       | The withdrawn schema is not governed, so a remaining copy is `QFAI-ASSETS-006`. | -     |
| AC-0004-0041 | packages/qfai/src/core/validators/tddList.ts               | packages/qfai/tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts | A `blocked` row is checked against its `Blocked-By` alone.                      | -     |
| BR-0004-0001 | packages/qfai/src/core/validate.ts                         | packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts        | The machine gate runs without the work-log validator.                           | -     |
| BR-0004-0017 | packages/qfai/src/core/validators/reviewerJustification.ts | packages/qfai/tests/validators/reviewerRejectedReadopt.test.ts               | `R-WORKLOG-DRIFT` left the justification-gated set.                             | -     |
| BR-0004-0028 | packages/qfai/src/core/validators/reviewerJustification.ts | packages/qfai/tests/integration/spec0004ProfileSuffixedValidate.test.ts      | The three-part rule for `R-PROMPT-SCANNER-DRIFT` is enforced here.              | -     |
| BR-0004-0034 | packages/qfai/src/core/validate.ts                         | packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts        | Validate does not read `.qfai/steering/`.                                       | -     |
| BR-0004-0034 | packages/qfai/src/core/governedAssistantManifest.ts        | packages/qfai/tests/integration/spec0004WithdrawnSchemaFinding.test.ts       | The withdrawn schema is not in the governed-asset manifest.                     | -     |
| BR-0004-0035 | packages/qfai/src/core/validators/tddList.ts               | packages/qfai/tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts | Ledger checks do not read `.qfai/steering/`.                                    | -     |

### Planned bindings

`State today` was checked against the tree.

| Implementation File                                                  | State today | BR / AC it will realize | Test File (planned)                      | Promotion trigger |
| -------------------------------------------------------------------- | ----------- | ----------------------- | ---------------------------------------- | ----------------- |
| packages/qfai/assets/init/.qfai/assistant/manifest/agent-catalog.yml | present     | AC-0004-0026            | packages/qfai/tests/codex/agents.test.ts | First edit        |

## Requirement bindings

Bindings at requirement level. The validator does not read this table.

| Requirement | Implementation File                                                                                                 | Test File                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| REQ-0013    | `packages/qfai/src/core/validate.ts`                                                                                | `packages/qfai/tests/core/validate.test.ts`                                                  |
| REQ-0014    | `packages/qfai/src/core/validators/skill/prototypingSkill.ts`                                                       | `packages/qfai/tests/skill/prototypingSkill.test.ts`                                         |
| REQ-0015    | `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`                                                          | `packages/qfai/tests/core/validate.test.ts`                                                  |
| REQ-0020    | `packages/qfai/src/core/validators/prototypingEvidence.ts`                                                          | `packages/qfai/tests/validators/prototypingEvidence.test.ts`                                 |
| REQ-0120    | `packages/qfai/src/core/validate.ts` (profile-suffixed path emission + always-latest validate.json `profile` field) | `packages/qfai/tests/integration/validateProfilePaths.test.ts` (planned, TC-0004-0055..0058) |
| REQ-0102    | `packages/qfai/scripts/lint-ssot-pair.ts` (planned; pair-changed lane consumed by `pnpm ci:lint`)                   | `packages/qfai/tests/integration/ssotSyncPairLane.test.ts` (planned, TC-0004-0059..0062)     |
| REQ-0125    | `packages/qfai/src/core/validators/reviewerReport.ts` (R-PROMPT-SCANNER-DRIFT justification 3-part validation)      | `packages/qfai/tests/core/reviewerReport.test.ts` (planned, TC-0004-0063..0064)              |
