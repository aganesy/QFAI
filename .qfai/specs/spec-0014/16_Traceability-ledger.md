# 16 Traceability Ledger

## Purpose

Link each obligation in this spec to the implementation file that realizes it and
the test file that proves it. `npx qfai validate` reads this file to enforce
implementation integrity: when a spec's `03_Acceptance-Criteria.md` or
`04_Business-Rules.md` changes on a branch, every implementation file linked from
a changed spec must also have changed in that branch, otherwise `QFAI-TRACE-001`
(severity `error`) fires.

## Ledger Table (required when this file exists)

| BR/AC        | Implementation File                                                                          | Test File                                                                           |
| ------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| AC-0014-0023 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/stageResultReceipts.test.ts     |
| AC-0014-0024 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/foreignReport.test.ts           |
| AC-0014-0025 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/unrunGate.test.ts               |
| AC-0014-0027 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/repairRouting.test.ts           |
| AC-0014-0028 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md                        | packages/qfai/tests/integration/verify/orchestrated/stageSkillHandover.test.ts      |
| AC-0014-0029 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/operationsTable.test.ts         |
| BR-0014-0001 | packages/qfai/src/core/validators/prototypingEvidence.ts                                     | packages/qfai/tests/unit/validators/prototypingEvidence.test.ts                     |
| BR-0014-0007 | packages/qfai/src/core/report.ts                                                             | packages/qfai/tests/core/report.test.ts                                             |
| BR-0014-0015 | packages/qfai/src/core/validators/prototypingEvidence.ts                                     | packages/qfai/tests/integration/validatePipelineIntegration.test.ts                 |
| BR-0014-0025 | packages/qfai/src/cli/commands/prototypingCertify.ts                                         | packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts |
| BR-0014-0026 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/stageResultReceipts.test.ts     |
| BR-0014-0027 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/foreignReport.test.ts           |
| BR-0014-0028 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/unrunGate.test.ts               |
| BR-0014-0030 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/repairRouting.test.ts           |
| BR-0014-0031 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md                        | packages/qfai/tests/integration/verify/orchestrated/stageSkillHandover.test.ts      |
| BR-0014-0032 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/operationsTable.test.ts         |
| BR-0014-0033 | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md | packages/qfai/tests/integration/verify/orchestrated/missingEnvironment.test.ts      |

### Planned bindings

`State today` was checked against the tree.

| Implementation File                                                                               | State today | BR / AC it will realize    | Test File (planned)                                                             | Promotion trigger |
| ------------------------------------------------------------------------------------------------- | ----------- | -------------------------- | ------------------------------------------------------------------------------- | ----------------- |
| packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/verify-output-contract.md | present     | AC-0014-0026, BR-0014-0029 | packages/qfai/tests/integration/verify/orchestrated/verifyJsonUnchanged.test.ts | First edit        |
