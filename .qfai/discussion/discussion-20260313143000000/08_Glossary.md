# 08_Glossary

## Term Definitions

| Term                          | Definition                                                                                               | Context                    | Source   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------- | -------- |
| SDP                           | Spec Diff Protocol。下流スキル実行時にspec変更を自動検出し、インクリメンタル処理を可能にするプロトコル      | 本 discussion の中心概念     | SRC-0001 |
| Preflight Diff                | スキル実行前に行う差分検出フェーズ。Phase 0 として3つのソースから changed_specs を特定する                  | スキル実行フロー             | SRC-0001 |
| changed_specs                 | Preflight Diff で検出された変更 spec のリスト。Source A と B の union                                       | 差分検出結果                | SRC-0001 |
| change_context                | delta.md から取得した変更の意図情報（Primary/Tags）。changed_specs の補強情報                               | 差分検出結果                | SRC-0008 |
| affected_specs                | changed_specs に policy 変更による影響波及分を加えた最終的な処理対象 spec リスト                            | 差分検出結果                | SRC-0001 |
| Implementation State Analysis | QFAI アノテーションをスキャンし、obligations の実装状態を分類する分析フェーズ                                | スキル実行フロー             | SRC-0007 |
| obligation                    | spec が定義する US/TC/CON-API 等の要件項目。テストや実装で充足すべき対象                                    | spec 構造                   | SRC-0009 |
| implemented                   | obligation に対応するアノテーション付きの実装/テストが存在し、spec 変更もない状態                            | 実装状態分類                | SRC-0001 |
| missing                       | obligation に対応する実装/テストが存在しない状態（新規追加分）                                              | 実装状態分類                | SRC-0001 |
| stale                         | obligation に対応する実装/テストは存在するが、spec が変更されたため更新が必要な状態                          | 実装状態分類                | SRC-0001 |
| unchanged                     | obligation も実装も変更がない状態。処理スキップ対象                                                        | 実装状態分類                | SRC-0001 |
| last_commit_sha               | evidence に記録される前回スキル実行時の git HEAD の SHA。Source A の基点                                     | evidence スキーマ            | SRC-0001 |
| last_run_timestamp            | evidence に記録される前回スキル実行の日時。Source B の基点                                                  | evidence スキーマ            | SRC-0001 |

## Abbreviations

| Abbreviation | Full Form                       | Notes                              |
| ------------ | ------------------------------- | ---------------------------------- |
| SDP          | Spec Diff Protocol              | 本 discussion の中心テーマ          |
| ISA          | Implementation State Analysis   | Phase 0.5 の分析フェーズ            |
| ATDD         | Acceptance Test Driven Development | QFAI の受入テスト駆動スキル        |
| SDD          | Specification Design Document   | QFAI の仕様設計スキル              |

## Rules

- Terms must be used consistently across all discussion artifacts.
- Ambiguous or context-dependent terms should include usage context.
