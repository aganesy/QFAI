# 99 Delta

## Change History

| Date       | Change Type | Section    | Summary | Rationale |
| ---------- | ----------- | ---------- | ------- | --------- |
| 2026-03-29 | adopted     | 01_Context | QFAI v1.7.6 remediation scope established from static audit | Audit revealed user-facing contradictions requiring targeted correction |
| 2026-03-29 | adopted     | 02_Inception-Deck | 4-workstream remediation structure selected | Preserves rollback boundaries and avoids mixing conceptual changes |
| 2026-03-29 | adopted     | 05_Scope | Static-first default as architectural principle | Real project feedback confirmed runtime-heavy defaults cause environment dependence and phase overlap |
| 2026-03-29 | adopted     | 06_REQ | 13 functional requirements derived from 13 audit issues | Direct 1:1 mapping from issue register |
| 2026-03-29 | adopted     | 11_OQ-Register | 3-layer evaluation model chosen over 4-axis | Aligns with final agreed design from audit session |
| 2026-03-29 | adopted     | 11_OQ-Register | v1.7.6a + v1.7.7 + v1.7.8 versioning chosen | Operationally cleaner for already-shared repos |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option | Reason | Recurrence Prevention |
| ---------- | ------- | --------------- | ------ | --------------------- |
| 2026-03-29 | OQ-0001 | Keep 4-axis evaluation model | Does not match final agreed architecture; affects scoring rubric logic, trend translation, and calibration design | Any future evaluation model changes must reference this decision and the 3-layer design rationale |
| 2026-03-29 | OQ-0002 | Downgrade render evidence to foundation-only | Internal implementation already exists; downgrading wastes completed work and misleads users about capability | Future capability claims in changelog must be verified against actual CLI behavior before release |
| 2026-03-29 | OQ-0003 | Content signals as primary UI-bearing detection | Creates false positives/negatives and doc/implementation drift | UI-bearing detection changes must always update both docs and validator in same PR |
| 2026-03-29 | OQ-0004 | Reopen v1.7.6 as pre-release | Confusing if repo already tagged/shared as v1.7.6 | Version numbering decisions must consider whether version has been publicly distributed |

## Rejected Visual Directions

Not applicable — non-ui surface type.

## Drift Events

| Date       | Trigger | Impact Assessment | Files Updated |
| ---------- | ------- | ----------------- | ------------- |
| 0 items    | -       | -                 | -             |
