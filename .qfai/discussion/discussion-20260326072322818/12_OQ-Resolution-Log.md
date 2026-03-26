# 12 OQ Resolution Log

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary | Evidence |
| ---------- | ------- | -------- | ------- | -------- |
| 2026-03-26 | OQ-0001 | created  | designSlopPatterns.json の match type 仕様について起票 | 設計文書 Section 8.3 |
| 2026-03-26 | OQ-0001 | resolved | SDD フェーズで match type 詳細設計とする。discussion では category ベース概念設計まで | 設計文書の scope 判断 |
| 2026-03-26 | OQ-0002 | created  | ddpBannedPatterns.txt と designSlopPatterns.json の統合方針について起票 | 設計文書 Section 5 |
| 2026-03-26 | OQ-0002 | resolved | 併存方針。設計文書に明確な記載あり | 設計文書 Section 5 |
| 2026-03-26 | OQ-0003 | created  | HTML mock パース深度について起票 | 設計文書 Section 11.3 |
| 2026-03-26 | OQ-0003 | resolved | v1.7.2 は text heuristics のみ。DOM rendering 不要 | 設計文書 Section 11.3 |
| 2026-03-26 | OQ-0004 | created  | Finding 重複制御の閾値について起票 | 設計文書 Section 17 |
| 2026-03-26 | OQ-0004 | deferred | 方針は明確だが具体的閾値は SDD/実装フェーズで決定 | 設計文書 Section 17 Risk D |
| 2026-03-26 | OQ-0005 | created  | Tier 3 default profile の info/warning 使い分けについて起票 | 設計文書 Section 7.2 |
| 2026-03-26 | OQ-0005 | deferred | category ベース分岐を推奨するが詳細は SDD で決定 | 設計文書 Section 7.2 |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
