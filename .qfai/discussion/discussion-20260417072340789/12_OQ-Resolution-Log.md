# 12_OQ-Resolution-Log — OQ 解決ログ

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary                                                                                                                                           | Evidence                                        |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 2026-04-17 | OQ-0001 | deferred | `PerSpecCoverage` dead fields の扱いを SDD フェーズに延期。実装詳細であり REQ の達成を妨げない。                                                   | delivery-planner preflight assessment           |
| 2026-04-17 | OQ-0002 | resolved | measurement.test.ts の `#screen:<slug>` reject テスト追加を決定。設計書 sec.6-3-1 に明示的に負例として記載されており追加必須。                    | SRC-0001 sec.6-3-1, delivery-planner            |
| 2026-04-17 | OQ-0003 | resolved | `scoreL1`/`scoreL2` は元から public export に含まれていないことを delivery-planner が確認。DoD 5-1 への追加アクション不要と判定。                 | SRC-0006, delivery-planner                      |
| 2026-04-17 | OQ-0004 | deferred | specCoverage.test.ts / refSemantics.test.ts の新規 vs 拡張判断を TDD フェーズに延期。設計書が「新規または既存拡張」と明示しており実ファイル確認が必要。 | SRC-0001 sec.7-8/7-9                            |
| 2026-04-17 | OQ-0005 | resolved | `isSpecDeclarationRef()` の `#L0` は reject。設計書が「positive integer」と明記。refSemantics.test.ts の境界値テストで確認する。                    | SRC-0001 sec.3-2, US-003 example seeds (WS-3)   |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
