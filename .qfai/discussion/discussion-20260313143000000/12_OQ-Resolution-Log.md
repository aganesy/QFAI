# 12_OQ-Resolution-Log

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary                                                      | Evidence                         |
| ---------- | ------- | -------- | ------------------------------------------------------------ | -------------------------------- |
| 2026-03-13 | OQ-0001 | created  | 差分検出の基点方式を検討                                     | discussion-20260313143000000     |
| 2026-03-13 | OQ-0001 | resolved | 複合判定（git diff + timestamp + delta.md）に決定            | ユーザー確認（conversation log） |
| 2026-03-13 | OQ-0002 | created  | /qfai-verify のインクリメンタル対応を検討                    | discussion-20260313143000000     |
| 2026-03-13 | OQ-0002 | resolved | 常にフルスキャン維持に決定                                   | ユーザー確認（conversation log） |
| 2026-03-13 | OQ-0003 | created  | 実装レイヤーの範囲を検討                                     | discussion-20260313143000000     |
| 2026-03-13 | OQ-0003 | resolved | SKILL.md のみの改修に決定                                    | ユーザー確認（conversation log） |
| 2026-03-13 | OQ-0004 | created  | 着手順序を検討                                               | discussion-20260313143000000     |
| 2026-03-13 | OQ-0004 | resolved | 共通 Protocol 先行に決定                                     | ユーザー確認（conversation log） |
| 2026-03-13 | OQ-0005 | created  | stale 判定のヒューリスティックを検討                         | discussion-20260313143000000     |
| 2026-03-13 | OQ-0005 | resolved | delta.md Primary が Behavior/Initial の場合のみ stale に決定 | SRC-0008                         |
| 2026-03-13 | OQ-0006 | created  | \_policies 変更時の影響範囲を検討                            | discussion-20260313143000000     |
| 2026-03-13 | OQ-0006 | resolved | 保守的に全 spec 影響 + ユーザー確認に決定                    | SRC-0009                         |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
