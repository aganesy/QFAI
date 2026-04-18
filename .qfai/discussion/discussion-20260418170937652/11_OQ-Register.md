# 11_OQ-Register

| OQ-ID | Title | Gate | Disposition | Owner | Rationale | Options | Recommendation | Next-Decision-Point | Due | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OQ-0001 | guideline coverage の必須カテゴリをどこまで固定するか | discussion | resolved | agent | 入力レポートが最低4カテゴリを提案している | A. spacing/color/accessibility/component_sizes の4固定 B. 2カテゴリ固定 C. project任せ | A | discussion で決定済み | 2026-04-18 | SRC-0001 §3 Fix B |
| OQ-0002 | TRD anchor の定量 proxy として何を許容するか | discussion | resolved | agent | validator 実装可能性と表現自由度の両立が必要 | A. px/ratio/rule ID/class/library default を許容 B. 数値のみ C. rule IDのみ | A | discussion で決定済み | 2026-04-18 | SRC-0001 §3 Fix C |
| OQ-0003 | 初期 severity を warning に固定するか | sdd | deferred | team | 既存 pack 影響の棚卸しが discussion では未完 | A. すぐ error B. 初期 warning C. config opt-in | B | SDD で migration 設計時に確定 | 2026-04-25 | SRC-0001 §3 Fix D |
| OQ-0004 | validator rule の配置先をどの module にするか | sdd | deferred | team | 既存 validator 構造との整合を設計で確認する必要がある | A. discussion validator B. uix validator C. 両方分割 | C | SDD で module mapping を確定 | 2026-04-25 | SRC-0001 §5 |

## Summary

| Status | Count |
| --- | --- |
| resolved | 2 |
| deferred | 2 |
| open | 0 |
| rejected | 0 |
