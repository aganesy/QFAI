# 12 OQ Resolution Log

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary                                                           | Evidence                       |
| ---------- | ------- | -------- | ----------------------------------------------------------------- | ------------------------------ |
| 2026-03-09 | OQ-0001 | created  | フレームワーク仕様CAPのテストケース粒度を検討                     | Interview: ユーザーがC-3案承認 |
| 2026-03-09 | OQ-0001 | resolved | Option A採用: qfai validateの構造検証ルールをTCとして定義         | 01_Context.md Assumptions      |
| 2026-03-09 | OQ-0002 | created  | SKILL.mdとspecsの二重管理リスクを検討                             | 01_Context.md Background       |
| 2026-03-09 | OQ-0002 | resolved | Option A採用: specsは設計意図の上位文書、SKILL.mdがSSOT           | 01_Context.md Assumptions      |
| 2026-03-09 | OQ-0003 | created  | 39エージェントカタログの粒度を検討                                | 05_Scope.md SC-005             |
| 2026-03-09 | OQ-0003 | resolved | Option A採用: 要約テーブルで全量網羅、詳細はagent定義ファイル参照 | 05_Scope.md SC-005             |
| 2026-03-09 | OQ-0004 | created  | \_policies/04_Business-Flow.md追加範囲を検討                      | 02_Inception-Deck.md Section 6 |
| 2026-03-09 | OQ-0004 | resolved | Option A採用: Canonical Workflow StagesをMermaid図で追記          | 02_Inception-Deck.md Section 6 |
| 2026-03-09 | OQ-0005 | created  | 既存\_policies/03_Capabilities.mdのCAP追加フォーマットを検討      | 09_Constraints.md TC-3         |
| 2026-03-09 | OQ-0005 | resolved | Option A採用: 既存フォーマット準拠で追記、カテゴリ明記            | 09_Constraints.md TC-3         |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
