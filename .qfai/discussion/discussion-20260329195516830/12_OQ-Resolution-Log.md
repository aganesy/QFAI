# 12 OQ Resolution Log

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary                                                                | Evidence             |
| ---------- | ------- | -------- | ---------------------------------------------------------------------- | -------------------- |
| 2026-03-29 | OQ-0001 | created  | Evaluation architecture model choice identified from P1-01             | SRC-0001             |
| 2026-03-29 | OQ-0001 | resolved | Converge to 3-layer model (invariant, trend-derived, product-specific) | Audit recommendation |
| 2026-03-29 | OQ-0002 | created  | Render evidence completion vs downgrade from P1-05                     | SRC-0001             |
| 2026-03-29 | OQ-0002 | resolved | Wire internal implementation to CLI/skill flow                         | SRC-0008, SRC-0009   |
| 2026-03-29 | OQ-0003 | created  | UI-bearing detection SSOT from P1-04                                   | SRC-0001             |
| 2026-03-29 | OQ-0003 | resolved | Surface classification as primary, content signals as fallback         | SRC-0006             |
| 2026-03-29 | OQ-0004 | created  | Versioning strategy for remediation from Section 6                     | SRC-0001             |
| 2026-03-29 | OQ-0004 | resolved | v1.7.6a hotfix + v1.7.7 correction + v1.7.8 cleanup                    | Audit recommendation |
| 2026-03-29 | OQ-0005 | created  | Browser QA implementation depth from P1-06                             | SRC-0001             |
| 2026-03-29 | OQ-0005 | deferred | Deferred to Correction Release C; scaffold exists, needs design        | SRC-0007             |
| 2026-03-29 | OQ-0006 | created  | Migration support scope from P2-03                                     | SRC-0001             |
| 2026-03-29 | OQ-0006 | deferred | Deferred to Correction Release C; scope TBD at start                   | SRC-0001             |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
