# 13 Deferred

## Deferred Items

| OQ-ID   | Title | Gate       | Deferred-Reason | Deferred-Until | Owner | Due        | Severity | Impact | Mitigation | Evidence |
| ------- | ----- | ---------- | --------------- | -------------- | ----- | ---------- | -------- | ------ | ---------- | -------- |
| OQ-0005 | Browser QA implementation depth | discussion | Full implementation requires design for structured phase execution and finding format; scaffold exists but is not feature-complete | Start of Correction Release C (estimated 2026-04-15) | agent | 2026-04-15 | medium | Implementation: browser QA findings remain empty; full-harness critique layer cannot fully rely on QA data | Scaffold-level runner returns empty findings; downstream layers must handle empty gracefully | SRC-0001 P1-06, SRC-0007 |
| OQ-0006 | Migration support scope | discussion | Number of older versions to support and migration path design requires assessment against real user base | Start of Correction Release C (estimated 2026-04-15) | agent | 2026-04-15 | low | Operations: old projects may break on upgrade without guidance; adoption friction | Document known breaking changes in CHANGELOG; advise manual qfai init --force for asset refresh | SRC-0001 P2-03 |

## Validation Rules

- Every deferred item in `11_OQ-Register.md` must have a corresponding row here.
- All 11 columns are mandatory for every row.
- `Severity`: `high`, `medium`, `low`.
- `Deferred-Until` must define when and by what signal re-evaluation happens.
