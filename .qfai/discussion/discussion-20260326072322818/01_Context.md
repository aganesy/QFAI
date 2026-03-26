# 01 Context

## Metadata

| Key           | Value                                                |
| ------------- | ---------------------------------------------------- |
| Discussion ID | discussion-20260326072322818                         |
| Date          | 2026-03-26                                           |
| Owner         | agent                                                |
| Source        | qfai_v1.7.2_design_audit_slop_guardrails_design.md  |

## Goal and Completion Criteria

### ゴール

v1.7.2 の目的は、QFAI の UI/UX 品質評価に静的な design audit と AI slop guardrails を導入すること。`qfai validate` が UI-bearing artifact に対して design audit を実行でき、AI slop / token drift / state omission / hierarchy weakness を検知できるようにする。

### 完了条件（測定可能）

1. `qfai validate` が UI-bearing packs に対して design audit findings を出力する
2. slop guardrail findings が stable rule ID 付きで出力される
3. rule tier が quality profile に応じて severity にマッピングされる
4. report が design audit と slop findings を分離してグループ化する
5. design token drift が token artifact 存在時に検知される
6. selected-anchor CTA mismatch と missing states が静的に検知される
7. docs, tests, validator registration が同一 PR で更新される

## Stakeholders

- **Primary**: QFAI コア開発チーム、UI/UX 品質管理担当
- **Secondary**: QFAI ユーザー（SDD/ATDD 実行者）、CI/CD パイプライン

## Background

### ビジネス背景

AI 生成 UI の品質低下（slop）がプロダクト品質に影響している。構造欠落検出だけでなく、設計判断の雑さを検知する need がある。

### 技術的背景

v1.6.5 に `ddpValidation.ts`, `designFidelity.ts`, `designToken.ts` 等の下地あり。ただし静的段階の design quality audit が散在しており、anti-pattern は DDP 内の単純文字列検出が中心。

### 履歴

- v1.7.0 — Discussion Design Hardening を実施済み
- v1.7.1 — Render Evidence Automation（optional）
- v1.7.2 — 静的監査に限定

## Inputs

- **設計文書**: `qfai_v1.7.2_design_audit_slop_guardrails_design.md`
- **既存バリデータ**: `ddpValidation.ts`, `designFidelity.ts`, `designToken.ts`, `uiDefinitionConsistency.ts`, `discussionVisuals.ts`, `densityHints.ts`
- **既存ルール**: `ddpBannedPatterns.txt`
- **既存型定義**: `types.ts` (Issue type), `config.ts` (QfaiConfig), `report.ts`

## Key Issues

1. 静的段階の design quality audit が散在しており、まとまった監査として出ない
2. anti-pattern は DDP 内の単純な文字列検出が中心で、generic AI UI / state omission / hierarchy weakness / token drift を横断的に見ていない
3. 現在の validator 群は「あるべき項目があるか」をよく見ているが、設計判断の雑さはまだ弱い
4. render evidence がなくても実行できる pre-render audit が不足している
