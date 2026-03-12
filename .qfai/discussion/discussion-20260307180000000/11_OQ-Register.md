# 11_OQ-Register

## Disposition Rules

- `open`: 未解決 - 完了前にゼロにする必要がある
- `resolved`: 解決済み
- `deferred`: 延期 - 13_Deferred.md に詳細必須
- `rejected`: 却下 - Rationale 必須

## Register

| OQ-ID   | Title                                       | Gate       | Disposition | Owner | Rationale                                                                           | Options                                                           | Recommendation              | Next-Decision-Point | Due  | Evidence                    |
| ------- | ------------------------------------------- | ---------- | ----------- | ----- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------- | ------------------- | ---- | --------------------------- |
| OQ-0001 | v2.0 でのプラグイン機構導入                 | discussion | resolved    | user  | 現時点では安定性を優先し、プラグイン機構は導入しない                                | A) プラグイン導入 B) 現状維持（バリデータ直接追加）               | B) 現状維持                 | v2.0 計画時         | 未定 | SRC-0001, 02_Inception-Deck |
| OQ-0002 | GUI / IDE プラグインの将来計画              | discussion | resolved    | user  | CLI のみで十分な価値を提供しており、GUI は Out of Scope                             | A) VS Code 拡張開発 B) Web ダッシュボード C) CLI のみ             | C) CLI のみ                 | v2.0 計画時         | 未定 | 05_Scope.md                 |
| OQ-0003 | validate.json の外部 API 安定性保証         | discussion | deferred    | agent | 現時点では内部契約として扱い、安定 API は次期で検討                                 | A) JSON Schema 公開 + 安定化宣言 B) 内部契約のまま維持            | B) 内部契約のまま維持       | v2.0 計画時         | v2.0 | SRC-0010, 09_Constraints    |
| OQ-0004 | レガシー spec-pack 形式の非推奨スケジュール | discussion | deferred    | user  | 既存ユーザーの移行期間が必要。v2.0 で非推奨化を正式決定                             | A) v1.6 で削除 B) v2.0 で削除 C) 永続サポート                     | B) v2.0 で削除              | v2.0 計画時         | v2.0 | SRC-0004, REQ-0109          |
| OQ-0005 | テストカバレッジの具体的数値目標            | discussion | resolved    | agent | 現時点では「全テストパス」を基準とし、具体的カバレッジ率は設定しない                | A) 80% ラインカバレッジ必須 B) 全テストパスのみ C) 段階的目標設定 | B) 全テストパスのみ         | -                   | -    | NFR-0051                    |
| OQ-0006 | 日本語ローカライゼーションの範囲            | discussion | resolved    | user  | doctor コマンドの一部メッセージのみ日本語対応済み。全面的ローカライゼーションは不要 | A) 全メッセージ日本語化 B) 現状維持（一部のみ） C) 英語のみに統一 | B) 現状維持                 | -                   | -    | SRC-0006, NFR-0041          |
| OQ-0007 | prototyping コマンドの skeleton モード詳細  | discussion | resolved    | agent | skeleton モードは uiFidelity.screens=[] で L1 evidence として記録                   | A) skeleton モード廃止 B) screens=[] で維持 C) 別フォーマット     | B) screens=[] で維持        | -                   | -    | SRC-0009, REQ-0050          |
| OQ-0008 | ウェイバーの最大有効期限ポリシー            | discussion | resolved    | agent | 有効期限切れウェイバーは自動的に無効化される。最大期限は設定しない                  | A) 6ヶ月最大 B) 1年最大 C) 期限なし（ユーザー責任）               | C) 期限なし（ユーザー責任） | -                   | -    | SRC-0009, REQ-0110          |

## Summary

- Total: 8
- Open: 0
- Resolved: 6
- Deferred: 2
- Rejected: 0
