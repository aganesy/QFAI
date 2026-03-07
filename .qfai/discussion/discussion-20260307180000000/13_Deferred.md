# 13 Deferred Items

## Deferred Table

| OQ-ID   | Title                                      | Gate       | Deferred-Reason                                              | Deferred-Until            | Owner | Due  | Severity | Impact                    | Mitigation                                                       | Evidence                 |
| ------- | ------------------------------------------ | ---------- | ------------------------------------------------------------ | ------------------------- | ----- | ---- | -------- | ------------------------- | ---------------------------------------------------------------- | ------------------------ |
| OQ-0003 | validate.json の外部 API 安定性保証        | discussion | 現時点では内部利用のみで安定 API の需要が限定的              | v2.0 計画フェーズ開始時   | agent | v2.0 | low      | spec / implementation     | validate.json は内部契約として扱い、バージョン間互換は保証しない | SRC-0010, 09_Constraints |
| OQ-0004 | レガシー spec-pack 形式の非推奨スケジュール | discussion | 既存ユーザーの移行期間が必要。突然の削除は breaking change   | v2.0 計画フェーズ開始時   | user  | v2.0 | medium   | spec / tests / implementation | レガシー形式のフォールバック検出を維持（REQ-0109）               | SRC-0004, CHANGELOG      |

## Rules

- OQ Register で `deferred` にした OQ-ID は必ず本テーブルに記載
- 全11カラムが必須（空欄不可）
- `Deferred-Until` は再評価のトリガー条件を明記
