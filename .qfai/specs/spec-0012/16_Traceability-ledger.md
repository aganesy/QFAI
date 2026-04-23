# 16 Traceability Ledger

| Layer                          | Current SSOT                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Skill                          | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`     |
| References                     | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/*` |
| Internal mode helper           | `packages/qfai/src/core/review/prototyping.ts`                                   |
| Harness history                | `packages/qfai/src/core/harness/history.ts`                                      |
| Harness result writer          | `packages/qfai/src/core/harness/resultWriter.ts`                                 |
| Evidence bundle                | `packages/qfai/src/core/evidence/bundleWriter.ts`                                |
| Prototyping evidence validator | `packages/qfai/src/core/validators/prototypingEvidence.ts`                       |
| UI evidence validator          | `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`                       |
| Validate gate                  | `packages/qfai/src/core/validate.ts`                                             |

## Requirement Mapping

| Requirement | Implementation File                              | Test File                                               |
| ----------- | ------------------------------------------------ | ------------------------------------------------------- |
| REQ-0021    | `packages/qfai/src/core/review/prototyping.ts`   | `packages/qfai/tests/core/prototypingMode.test.ts`      |
| REQ-0022    | `packages/qfai/src/core/harness/types.ts`        | `packages/qfai/tests/core/harness/history.test.ts`      |
| REQ-0023    | `packages/qfai/src/core/harness/history.ts`      | `packages/qfai/tests/core/harness/history.test.ts`      |
| REQ-0024    | `packages/qfai/src/core/harness/resultWriter.ts` | `packages/qfai/tests/core/harness/resultWriter.test.ts` |
| REQ-0025    | `packages/qfai/src/core/harness/history.ts`      | `packages/qfai/tests/core/harness/history.test.ts`      |

## Notes

- `US-0012-0001..0097` and `TC-0012-0001..0309` remain valid traceability namespaces.
- Active posture is skill-first; internal mode helpers and harness artifacts are traceable but not public runtime surfaces.
