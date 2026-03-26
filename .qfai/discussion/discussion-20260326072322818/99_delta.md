# 99 Delta

## Change History

| Date       | Change Type | Section           | Summary                                                                    | Rationale                                     |
| ---------- | ----------- | ----------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| 2026-03-26 | adopted     | 01_Context        | v1.7.2 Design Audit & Slop Guardrails の背景・目的・ステークホルダーを記載 | 設計文書に基づく初期記載                      |
| 2026-03-26 | adopted     | 02_Inception-Deck | 10 質問 + Mermaid アーキテクチャ図を記載                                   | 設計文書に基づく初期記載                      |
| 2026-03-26 | adopted     | 03_Story-Workshop | 5 ユーザーストーリー + Example Seeds + フロー図を記載                      | 設計文書に基づく初期記載                      |
| 2026-03-26 | adopted     | 04_Sources        | 10 ソース（設計文書 + 既存バリデータ）を登録                               | 設計文書に基づく初期記載                      |
| 2026-03-26 | adopted     | 05_Scope          | スコープ境界と成功基準を定義                                               | 設計文書 Section 2 に基づく                   |
| 2026-03-26 | adopted     | 06_REQ            | 14 機能要件を登録                                                          | 設計文書の feature design に基づく            |
| 2026-03-26 | adopted     | 07_NFR            | 6 非機能要件を登録                                                         | 設計文書の design principles + risks に基づく |
| 2026-03-26 | adopted     | 08_Glossary       | 10 用語 + 6 略語を定義                                                     | 設計文書の用語に基づく                        |
| 2026-03-26 | adopted     | 09_Constraints    | 5 技術制約 + 2 運用制約を定義                                              | 設計文書 Section 3 Design principles に基づく |
| 2026-03-26 | adopted     | 10_Policy         | セキュリティ/コンプライアンス/開発/運用ポリシーを定義                      | QFAI プロジェクト標準に基づく                 |
| 2026-03-26 | adopted     | 11_OQ-Register    | 5 OQ を登録（3 resolved, 2 deferred）                                      | 設計文書の曖昧点・実装判断を整理              |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option                        | Reason                                                                                             | Recurrence Prevention                                                                       |
| ---------- | ------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2026-03-26 | OQ-0001 | A: discussion で match type 一覧を確定 | match type の詳細は実装レベルの設計判断であり、discussion フェーズの粒度を超える                   | SDD フェーズの spec に match type 仕様セクションを必須とする                                |
| 2026-03-26 | OQ-0002 | A: 全面 JSON 移行                      | ddpBannedPatterns.txt は DDP 固有の simple text ban として十分機能しており、移行コストに見合わない | designSlop.ts は ddpBannedPatterns.txt を直接参照せず、designSlopPatterns.json のみ使用する |
| 2026-03-26 | OQ-0003 | A: DOM パーサー導入                    | v1.7.2 は静的監査に限定。DOM rendering は v1.7.3+ の render/browser evidence フェーズで扱う        | Out of Scope に明記し、v1.7.3 のスコープ候補として記録                                      |

## Rejected Visual Directions

- N/A — 非 UI-bearing パック。

## Drift Events

| Date | Trigger | Impact Assessment | Files Updated |
| ---- | ------- | ----------------- | ------------- |
| -    | -       | -                 | -             |
