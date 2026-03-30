# 01 Context

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260330183225659 |
| Date          | 2026-03-30                   |
| Owner         | user                         |
| Source         | ユーザー直接要求 — spec引数省略時の自動検出とトレーサビリティ完全性チェック |

## Goal and Completion Criteria

- Goal: `/qfai-prototyping` と `/qfai-implement` のスキルにおいて、spec引数が省略された場合に差分自動検出でターゲットspecを特定し、specとソースコードの整合性（トレーサビリティ完全性）を検証・修正指示する仕組みを構築する
- Measurable completion criteria:
  - SKILL.md に「Spec Auto-Discovery Protocol」セクションが追加され、spec引数省略時の動作が明確に定義されている
  - TypeScript で4ソース統合差分検出モジュールが実装されている
  - `qfai validate` にspec-実装トレーサビリティ検証が追加されている
  - 「specの指定が無いから作業できない」状況が解消される

## Stakeholders

- Primary stakeholders: QFAI利用開発者、AIコーディングエージェント（Claude Code / Copilot / Codex）
- Secondary stakeholders: QFAIフレームワーク利用プロジェクトの開発チーム

## Background

- Business context: QFAIワークフローにおいて、`/qfai-prototyping` と `/qfai-implement` は開発の中核スキルであるが、spec引数の省略時にエージェントが作業を開始できず停止する事象が全エージェント共通で多発している。これにより開発効率が著しく低下している。
- Technical context:
  - spec-0011 で「Preflight Diff Protocol（3ソース統合差分検出）」が既に定義されているが、SKILL.mdへの統合が不完全
  - 現行の `/qfai-prototyping` は全spec対象（`spec-*` 全件）が前提だが、差分検出による効率化が未実装
  - 現行の `/qfai-implement` は `<spec-id>` が必須引数だが、省略時のフォールバックが存在しない
  - specのBR/ACが変更された場合、対応するソースコードの変更有無をチェックする仕組みが存在しない
- Historical context:
  - spec-0011 の Preflight Diff Protocol は議論済みだが、REQ-0008（prototypingインクリメンタルモード）とREQ-0007（atddインクリメンタルモード）の実装が未着手
  - DR-0006: 「git diffのみに依存しない。3ソース統合を採用する」決定済み

## Inputs

- Existing repository facts:
  - `.qfai/specs/spec-0011/` — Preflight Diff Protocol 仕様
  - `.github/skills/qfai-prototyping/SKILL.md` — 現行prototypingスキル定義
  - `.github/skills/qfai-implement/SKILL.md` — 現行implementスキル定義
  - `packages/qfai/src/core/specLayout.ts` — spec検出ロジック（collectSpecEntries）
  - `packages/qfai/src/core/validate.ts` — バリデーションパイプライン
  - `packages/qfai/src/core/discovery.ts` — spec発見ユーティリティ
- External references: なし
- Assumptions:
  - git がインストールされている環境が主なターゲット（git不在時はフォールバック）
  - `origin/main` がデフォルトのベースブランチ

## Key Issues

- Issue 1: spec引数省略時にエージェントが「作業不可」として停止する — 全エージェント共通で発生
- Issue 2: specのBR/AC変更に対して実装コードの追従が検出されない — トレーサビリティの断絶
- Issue 3: spec-0011のPreflight Diff Protocolが定義済みだがSKILL.mdに統合されていない
- Issue 4: `qfai validate` にspec-実装の整合性チェックがない
