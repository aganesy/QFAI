# 16 Traceability Ledger

| Layer                 | Current SSOT                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| Skill                 | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`     |
| References            | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/*` |
| Validate gate         | `packages/qfai/src/core/validate.ts`                                             |
| UI evidence validator | `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`                       |
| Report wording        | `packages/qfai/src/core/report.ts`                                               |

## Notes

- `US-0012-0001..0093` and `TC-0012-0001..0305` remain valid traceability namespaces.
- Active posture is skill-first; legacy validator slices remain traceable but are not public runtime surfaces.
