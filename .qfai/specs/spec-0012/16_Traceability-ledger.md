# 16 Traceability Ledger

| Layer                          | Current SSOT                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Skill                          | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`     |
| References                     | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/*` |
| DESIGN.md schema               | `packages/qfai/src/core/design/designMd.ts`                                      |
| DESIGN.md lock SSOT            | `packages/qfai/src/core/design/designMdLock.ts`                                  |
| Iterate driver                 | `packages/qfai/src/cli/commands/prototypingIterate.ts`                           |
| Certify driver                 | `packages/qfai/src/cli/commands/prototypingCertify.ts`                           |
| Iteration model                | `packages/qfai/src/core/prototyping/iteration.ts`                                |
| Evaluator review schema        | `packages/qfai/src/core/prototyping/evaluatorReview.ts`                          |
| DESIGN.md violations scanner   | `packages/qfai/src/core/prototyping/designMdViolations.ts`                       |
| Layout anti-pattern registry   | `packages/qfai/src/core/validators/layoutAntiPatterns.ts` (+ JSON sibling)       |
| Completion certificate         | `packages/qfai/src/core/prototyping/certificate.ts`                              |
| Spec resolution                | `packages/qfai/src/core/prototyping/specResolution.ts`                           |
| Prototyping evidence validator | `packages/qfai/src/core/validators/prototypingEvidence.ts`                       |
| Design contract readiness      | `packages/qfai/src/core/validators/designContractReadiness.ts`                   |
| Test todo validator            | `packages/qfai/src/core/validators/testTodoStubs.ts`                             |
| UI evidence validator          | `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`                       |
| Validate gate                  | `packages/qfai/src/core/validate.ts`                                             |

## Requirement Mapping

| Requirement   | Implementation File                                            | Test File                                                             |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| REQ-0012-0030 | `packages/qfai/src/core/design/designMd.ts`                    | `packages/qfai/tests/core/design/designMd.test.ts`                    |
| REQ-0012-0031 | `packages/qfai/src/cli/commands/prototypingIterate.ts`         | `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`         |
| REQ-0012-0032 | `packages/qfai/src/core/prototyping/iteration.ts`              | `packages/qfai/tests/core/prototyping/iteration.test.ts`              |
| REQ-0012-0033 | `packages/qfai/src/core/prototyping/evaluatorReview.ts`        | `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`        |
| REQ-0012-0034 | `packages/qfai/src/core/validators/layoutAntiPatterns.ts`      | `packages/qfai/tests/core/validators/layoutAntiPatterns.test.ts`      |
| REQ-0012-0035 | `packages/qfai/src/core/prototyping/designMdViolations.ts`     | `packages/qfai/tests/core/prototyping/designMdViolations.test.ts`     |
| REQ-0012-0036 | (negative-existence; enforced lexically by sanity-grep gate)   | (see \_policies / distributed-surface guard)                          |
| REQ-0012-0037 | `packages/qfai/src/cli/commands/prototypingCertify.ts`         | `packages/qfai/tests/cli/prototypingCertify.test.ts`                  |
| REQ-0012-0038 | `packages/qfai/src/core/design/designMdLock.ts`                | `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`         |
| REQ-0012-0039 | `packages/qfai/src/core/prototyping/certificate.ts`            | `packages/qfai/tests/cli/prototypingCertify.test.ts`                  |
| REQ-0012-0040 | `packages/qfai/src/core/validators/designContractReadiness.ts` | `packages/qfai/tests/core/validators/designContractReadiness.test.ts` |
| REQ-0012-0041 | `packages/qfai/src/core/doctor.ts`                             | `packages/qfai/tests/cli/doctor.test.ts`                              |

## Notes

- `REQ-0012-0001..0010` are reserved historical identifier space (no
  active text — body was retired before this PR per `_policies/11_Slice-Policy.md`
  §ID 安定性ルール 5).
- `US-0012-0001..0097` and `TC-0012-0001..0309` remain valid
  traceability namespaces; some are marked `exception` in
  `tdd/test-list.md` where the originating tests were removed.
- Active posture is skill-first: the prototyping CLI commands (`iterate`,
  `certify`, `show-spec`) are the public runtime surfaces; internal
  helpers under `src/core/prototyping/` and `src/core/design/` are
  reusable building blocks.
- Former `spec-0017` (CAP-0017 v2.0 single-thread evolution loop /
  UX-loop redesign) and `spec-0018` are absorbed into `spec-0012`; the
  standalone directories no longer exist.
