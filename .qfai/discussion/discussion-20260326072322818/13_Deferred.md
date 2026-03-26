# 13 Deferred

## Deferred Items

| OQ-ID   | Title | Gate       | Deferred-Reason | Deferred-Until | Owner | Due | Severity | Impact | Mitigation | Evidence |
| ------- | ----- | ---------- | --------------- | -------------- | ----- | --- | -------- | ------ | ---------- | -------- |
| OQ-0004 | Finding 重複制御の閾値 | discussion | 設計文書に方針（cap duplicate, aggregate）は記載あるが、具体的な数値閾値は実装レベルの判断が必要 | SDD フェーズ開始時に designAudit.ts の実装設計と合わせて決定 | agent | v1.7.2 SDD | low | 閾値未定でも finding 自体は出力可能。report の verbosity に影響 | 初期実装では閾値なし（全件出力）で進め、SDD でキャップ値を設定 | 設計文書 Section 17 Risk D |
| OQ-0005 | Tier 3 default profile の info/warning 使い分け | discussion | 設計文書に「info/warning in default」と記載あるが、具体的にどの category が info でどれが warning かの分岐条件は未定義 | SDD フェーズ開始時に rule taxonomy テーブルと合わせて決定 | agent | v1.7.2 SDD | low | severity mapping の精度に影響するが、全て warning で仮実装可能 | 初期実装では default profile の Tier 3 は全て warning で統一し、SDD で分岐を設計 | 設計文書 Section 7.2 |

## Validation Rules

- Every deferred item in `11_OQ-Register.md` must have a corresponding row here.
- All 11 columns are mandatory for every row.
- `Severity`: `high`, `medium`, `low`.
- `Deferred-Until` must define when and by what signal re-evaluation happens.
