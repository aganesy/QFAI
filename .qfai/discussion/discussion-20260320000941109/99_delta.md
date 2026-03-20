# 99_delta

## Adopted

| Date       | Change Type | Section                 | Summary                                                       | Rationale                                                                              |
| ---------- | ----------- | ----------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 2026-03-20 | adopted     | Sub-agent roster        | qfai-implement のサブエージェントロスターを形式化             | SRC-0001 に基づき、サブエージェントの役割・呼び出し順序・責務を明文化する必要がある    |
| 2026-03-20 | adopted     | Completion contract     | 完了コントラクトの堅牢化（完了判定条件の明確化）              | SRC-0001 に基づき、各フェーズの完了を構造的に検証可能にする                            |
| 2026-03-20 | adopted     | Evidence contract       | エビデンスコントラクトの堅牢化（自由文+明示ラベル形式を採用） | SRC-0001 S6.2 に従い、v1.6.2 では自由文+ラベル、将来バージョンで厳格 JSON へ段階的移行 |
| 2026-03-20 | adopted     | Parallel dispatch rules | 並列ディスパッチルールの策定（ワークツリー/ブランチ分離必須） | SRC-0001 S7.1, S7.3 に基づき、並列実行時の競合防止を保証する                           |
| 2026-03-20 | adopted     | Docs/wrappers/assets    | docs/wrappers/assets テストの同期ルール策定                   | SRC-0001 S10.1 に基づき、ラッパー記述と実装の乖離を防止する                            |

## Rejected

| Date       | Rejected Option                                        | Reason                                                                                     | Recurrence Prevention                                                                                         |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 2026-03-20 | Evidence JSON schema (厳格 JSON スキーマの即時導入)    | v1.6.2 では自由文+明示ラベルで十分。厳格 JSON は将来バージョンに延期。SRC-0001 S6.2 に明記 | DO NOT: v1.6.2 で厳格 JSON スキーマを導入しない。Temptation: 構造化を急いで自由文の柔軟性を失いたくなる       |
| 2026-03-20 | Hard error validators (バリデータ警告のハードエラー化) | v1.6.2 では warnings only。ハードエラーは将来バージョンで段階導入。SRC-0001 S9 に明記      | DO NOT: v1.6.2 でバリデータ警告をハードエラーにしない。Temptation: 厳格な検証のためにハードエラーにしたくなる |
| 2026-03-20 | Coverage numerical targets (カバレッジ数値目標の設定)  | v1.6.2 のスコープ外。カバレッジ数値目標は別途検討が必要であり、本リリースでは対象外        | DO NOT: v1.6.2 でカバレッジ数値目標を定義しない。Temptation: 品質保証のために具体的な数値を設定したくなる     |

## Drift

None recorded.

## Recurrence Prevention

None needed (no drift events).

## Discussion Pack 参照

- **Discussion Pack**: `discussion-20260320000941109`
- **関連 OQ**: OQ-0001 -- OQ-0005（全件解決済み）
- **関連ソース**: SRC-0001 (implementation design), SRC-0002 (task checklist)
