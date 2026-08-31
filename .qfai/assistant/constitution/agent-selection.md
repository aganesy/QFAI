---
id: agent-selection
category: project
update_frequency: occasional
---

<!-- markdownlint-disable MD041 -->

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# エージェント選択ガイド（QFAI Toolkit）

QFAI のサブエージェントの**選定**は、**agent-catalog + agent-routing + review-profiles** を SSOT とする。  
選定は「成果物の種類」と「phase の役割」で行い、skill 本文の直感では決めない。

ただしエージェントの**本文（mission / responsibilities / stop conditions 等）**の SSOT は
`.qfai/assistant/agents/<id>.md` である。`agent-catalog.yml` の `developer_instructions`
はそこから導出される派生コピーであり、そこに新しい内容を書き起こさない。本文を変更するときは
markdown 側を編集し、その `## Mission` 見出し以降をそのままブロックへ写して一致させる
（乖離もブロックの欠落も `QFAI-AGENT-014` が警告する）。

## 中核原則

- 司令塔は常に `orchestrator`
- 計画は `delivery-planner`
- 要件・OQ・選択肢は `requirements-analyst`
- 技術構造と契約は `solution-architect`
- UX / visual / IA / 遷移は `product-experience-architect`
- 最終完了判定は `completion-reviewer`
- validate / coverage / runtime / prototyping gate は `qa-gatekeeper`

## 代表シナリオ

| 状況                                  | 主担当                         | 併用                                                  |
| ------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| 課題の初期整理・論点洗い出し          | `discovery-analyst`            | `delivery-planner`                                    |
| 要件整理・仕様化                      | `requirements-analyst`         | `solution-architect`, `product-experience-architect`  |
| 構造設計・契約設計                    | `solution-architect`           | `delivery-planner`                                    |
| UI/UX 方針や sidecar artifacts の整理 | `product-experience-architect` | `requirements-analyst`                                |
| フロント実装                          | `frontend-engineer`            | `implementation-reviewer`, `product-surface-reviewer` |
| バックエンド実装                      | `backend-engineer`             | `implementation-reviewer`                             |
| 受入テスト実装                        | `acceptance-test-engineer`     | `test-design-analyst`, `qa-strategist`                |
| テスト設計・coverage 整理             | `test-design-analyst`          | `qa-strategist`                                       |
| 品質ゲート実行                        | `devops-ci-engineer`           | `qa-gatekeeper`, `completion-reviewer`                |
| ドキュメント同期                      | `doc-steward`                  | `delivery-planner`                                    |

## reviewer の使い分け

- 完了契約・DoD・drift 監査: `completion-reviewer`
- 要件・OQ・選択肢の妥当性: `requirements-reviewer`
- 構造・契約・境界の妥当性: `architecture-reviewer`
- 実装品質・保守性・backend 安全性: `implementation-reviewer`
- UI 実装・UX・デザイン整合: `product-surface-reviewer`
- validate / coverage / runtime / prototyping gate: `qa-gatekeeper`

## 原則の適用

- 実装担当 (`frontend-engineer`, `backend-engineer`) は `.github/instructions/principles.instructions.md` と `.instruction/00_universal/development-principles-checklist.md` の観点を、実装時の判断基準として適用する。
- 設計担当 (`solution-architect`, `product-experience-architect`) は同じ原則を、構造・契約・UX 方向性の設計基準として適用する。
- レビュー担当 (`implementation-reviewer`, `architecture-reviewer`, `product-surface-reviewer`) は `.github/instructions/code-review.instructions.md` と `.github/instructions/principles.instructions.md` をレビュー観点として適用し、指摘時は原則名と改善理由を明示する。

## 迷ったときの基準

- 何から着手するか曖昧 → `delivery-planner`
- 何を作るべきか曖昧 → `requirements-analyst`
- どう作るか曖昧 → `solution-architect`
- 体験品質が論点 → `product-experience-architect`
- 実装の正しさ確認 → `implementation-reviewer`
- 完了してよいか確認 → `completion-reviewer`

MCP の使いどころは `.instruction/02_project/mcp.md` を参照する。
