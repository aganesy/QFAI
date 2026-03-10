# 09_Constraints

## Technical Constraints

| ID | Constraint | Impact |
|----|-----------|--------|
| TC-01 | 変更対象は 10_Plan.md および 04_Business-Rules.md の Notes 列に限定する | US/AC/BR/EX/TC の ID 体系を変更しない |
| TC-02 | qfai validate --fail-on error が修正後も 0 error で通過すること | 既存バリデーションルールとの互換性維持 |
| TC-03 | Markdown フォーマットは既存 spec の書式に準拠する | テーブル形式、見出しレベルの一貫性 |

## Operational Constraints

| ID | Constraint | Impact |
|----|-----------|--------|
| OC-01 | /qfai-sdd による spec 更新は1回のパスで完了させる | 複数回の SDD ラウンドは不要 |
| OC-02 | 既存の discussion pack（discussion-20260307*, discussion-20260309*）を変更しない | Append-only ポリシー |

## Legal / Compliance Constraints

該当なし（既存ライセンス MIT で変更なし）

## Budget Constraints

該当なし

## Deadline Constraints

| ID | Constraint | Notes |
|----|-----------|-------|
| DL-01 | 本 discussion 完了後、速やかに /qfai-sdd を実行可能であること | ブロッカーなし状態の確保 |
