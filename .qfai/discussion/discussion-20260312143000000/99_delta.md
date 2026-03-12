# 99_delta

## Change History

| Date       | Change Type | Section         | Summary                                                                     | Rationale                                  |
| ---------- | ----------- | --------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| 2026-03-12 | adopted     | 01_Context      | 初期 Context 作成                                                           | ユーザーリクエストに基づく                 |
| 2026-03-12 | adopted     | 02_Inception    | Inception Deck 作成、アーキテクチャ図を Mermaid で記述                      | プロジェクト概要の明確化                   |
| 2026-03-12 | adopted     | 03_Story        | 4 ユーザーストーリー + Example Seeds + ユーザーフロー図作成                 | 要件の具体化                               |
| 2026-03-12 | adopted     | 04-10           | Sources, Scope, REQ (11件), NFR (6件), Glossary, Constraints, Policy 作成   | 要件定義と制約の文書化                     |
| 2026-03-12 | adopted     | 11_OQ-Register  | OQ 5件を登録し全て resolved                                                 | 設計判断の明示的記録                       |
| 2026-03-12 | adopted     | 12_OQ-Res-Log   | 全 OQ の resolution timeline を記録                                         | 決定プロセスの透明性確保                   |
| 2026-03-12 | adopted     | 13_Deferred     | Deferred 0件（全 OQ 解決済み）                                              | discussion フェーズでの完全解決            |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option                                       | Reason                                                             | Recurrence Prevention                                   |
| ---------- | ------- | ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| 2026-03-12 | OQ-0001 | A: canonical を `.agent.md` に改名                    | canonical ファイル名の変更は影響範囲が大きく不要                   | symlink は名前不一致を許容する事実を Glossary に記録     |
| 2026-03-12 | OQ-0002 | B: copilot-instructions.md を削除                     | Copilot 統合のルール記述は引き続き必要                             | REQ-0007 で参照先更新を明示                              |
| 2026-03-12 | OQ-0003 | B: pr-fix/pr-merge を `.qfai/assistant/skills/` に移動 | QFAI 外の skill は QFAI 管理対象外                                | Scope の Out of Scope に明記                             |
| 2026-03-12 | OQ-0004 | A: エラーメッセージ表示のみで中断                     | 処理続行しないことで中途半端な状態を防止（C が A より安全）        | REQ-0009 に明記                                          |
| 2026-03-12 | OQ-0004 | B: junction + テキストファイル fallback               | 二重の互換性レイヤーが複雑性を増す                                 | REQ-0009 に明記                                          |

## Drift Events

| Date | Trigger | Impact Assessment | Files Updated |
| ---- | ------- | ----------------- | ------------- |
| -    | -       | -                 | -             |
