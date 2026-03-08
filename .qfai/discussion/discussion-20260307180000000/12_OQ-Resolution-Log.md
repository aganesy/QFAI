# 12 OQ Resolution Log

## Log

| Date       | OQ-ID   | Action   | Summary                                                     | Evidence                     |
| ---------- | ------- | -------- | ----------------------------------------------------------- | ---------------------------- |
| 2026-03-07 | OQ-0001 | created  | v2.0 でのプラグイン機構導入について検討開始                 | リポジトリ分析               |
| 2026-03-07 | OQ-0001 | resolved | 現時点では安定性優先。バリデータ直接追加方式を維持          | 02_Inception-Deck Trade-offs |
| 2026-03-07 | OQ-0002 | created  | GUI / IDE プラグインの将来計画について検討開始              | リポジトリ分析               |
| 2026-03-07 | OQ-0002 | resolved | CLI のみで十分な価値提供。05_Scope の Out of Scope に明記   | 05_Scope.md                  |
| 2026-03-07 | OQ-0003 | created  | validate.json の外部 API 安定性保証について検討開始         | SRC-0010                     |
| 2026-03-07 | OQ-0003 | deferred | 内部契約として維持。v2.0 で安定 API 化を再検討              | 09_Constraints OC-02         |
| 2026-03-07 | OQ-0004 | created  | レガシー spec-pack 形式の非推奨スケジュールについて検討開始 | SRC-0004                     |
| 2026-03-07 | OQ-0004 | deferred | 既存ユーザーの移行期間を考慮し、v2.0 での削除を計画         | CHANGELOG migration guides   |
| 2026-03-07 | OQ-0005 | created  | テストカバレッジの具体的数値目標について検討開始            | NFR-0051                     |
| 2026-03-07 | OQ-0005 | resolved | 全テストパスを基準とし、具体的カバレッジ率は不設定          | NFR-0051                     |
| 2026-03-07 | OQ-0006 | created  | 日本語ローカライゼーションの範囲について検討開始            | SRC-0006                     |
| 2026-03-07 | OQ-0006 | resolved | 現状維持（doctor の一部メッセージのみ日本語対応）           | NFR-0041                     |
| 2026-03-07 | OQ-0007 | created  | prototyping コマンドの skeleton モード詳細について検討開始  | SRC-0009                     |
| 2026-03-07 | OQ-0007 | resolved | screens=[] で L1 evidence として記録する方式を維持          | REQ-0050                     |
| 2026-03-07 | OQ-0008 | created  | ウェイバーの最大有効期限ポリシーについて検討開始            | SRC-0009                     |
| 2026-03-07 | OQ-0008 | resolved | 期限なし（ユーザー責任）。有効期限切れは自動無効化          | REQ-0110                     |

## Rules

- このログは append-only（追記のみ）
- 各エントリには Date, OQ-ID, Action, Summary, Evidence が必須
- Action: created / resolved / deferred / rejected / reopened
