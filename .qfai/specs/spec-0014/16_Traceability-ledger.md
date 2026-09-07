# 16 Traceability Ledger

## Purpose

Link each obligation in this spec to the implementation file that realizes it and
the test file that proves it. `npx qfai validate` reads this file to enforce
implementation integrity: when a spec's `03_Acceptance-Criteria.md` or
`04_Business-Rules.md` changes on a branch, every implementation file linked from
a changed spec must also have changed in that branch, otherwise `QFAI-TRACE-001`
(severity `error`) fires.

## Ledger Table (required when this file exists)

| BR/AC        | Implementation File                                      | Test File                                                                           |
| ------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| BR-0014-0001 | packages/qfai/src/core/validators/prototypingEvidence.ts | packages/qfai/tests/unit/validators/prototypingEvidence.test.ts                     |
| BR-0014-0007 | packages/qfai/src/core/report.ts                         | packages/qfai/tests/core/report.test.ts                                             |
| BR-0014-0015 | packages/qfai/src/core/validators/prototypingEvidence.ts | packages/qfai/tests/integration/validatePipelineIntegration.test.ts                 |
| BR-0014-0025 | packages/qfai/src/cli/commands/prototypingCertify.ts     | packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts |
