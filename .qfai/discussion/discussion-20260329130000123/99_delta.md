# 99 Delta

## Metadata

| Key | Value |
| --- | --- |
| Discussion ID | discussion-20260329130000123 |
| Date | 2026-03-29 |

## Adopted Decisions

| Decision ID | Title | Adopted Option | Rationale |
| --- | --- | --- | --- |
| DEC-0001 | Prototyping default correction | static-first default | runtime-heavy obligations を default から外すことが主目的だから |
| DEC-0002 | Evidence capability semantics | optional capability with captured/skipped/failed | default 軽量性と evidence richness を両立するため |
| DEC-0003 | Backend strategy | provider abstraction with optional registration | web 固定を避けつつ将来 backend を許容するため |
| DEC-0004 | Browser QA output | structured findings + repair suggestions | downstream 修正を actionable にするため |
| DEC-0005 | Mode split | standard / low-cost / full-harness expectation split | obligation 混線を防ぐため |

## Rejected Options

| Decision ID | Rejected Option | Reason | Recurrence Prevention |
| --- | --- | --- | --- |
| DEC-0001 | runtime-heavy default を維持する | phase mismatch と ATDD 重複を再発させる | default と opt-in runtime obligations を別表現で維持する |
| DEC-0002 | browser availability を default hard dependency にする | non-web / non-visual project を壊す | capability absent case を常に設計に含める |
| DEC-0003 | Playwright 固定 backend | provider 拡張性と fail-open 設計を損なう | abstraction 先行、backend 実装後置を維持する |

## Drift Events

0 items

## Change History

| Date | Change Type | Files Affected | Description |
| --- | --- | --- | --- |
| 2026-03-29 | Initial | All 15 files | v1.7.5 discussion pack initial creation |
