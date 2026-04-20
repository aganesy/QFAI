# 01_Context

## Surface Classification

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces:
- classification_rationale: 対象は packages/qfai 内の skill テンプレート、discussion テンプレート、validator 実装であり、今回の変更自体は画面サーフェスを持たない。

## Metadata

| 項目 | 値 |
| --- | --- |
| Discussion ID | discussion-20260418170937652 |
| Date | 2026-04-18 |
| Owner | agent |
| Input | `<local-path>/tmp/qfai-package-feedback-dgs-axis.md` |
| Stage mode | Simulation mode allowed |
| Output target | `packages/qfai/` の discussion/validator/template 改善方針 |

## Background

QFAI の UI-bearing workflow では、`/qfai-discussion` が Trend Scan を行い、その結果を後続の `/qfai-prototyping` に渡す。今回の入力レポートは、full-harness が高得点を出してもテーブル行高、コントラスト、タッチターゲットなどの基礎品質を取り逃がした事象を報告している。

報告の中心論点は、問題が prototyping の個別実装ミスではなく、discussion で作る Trend Scan と TRD 軸がデザイン指南書の定量基準を拾えていないことにある。したがって改善対象は運用成果物 `.qfai/` ではなく、QFAI パッケージ本体の source/template/validator である。

## Problem Statement

### Primary problem

UI-bearing discussion において、Trend Scan から TRD 軸へ移る際にデザイン指南書の定量根拠が欠落しうるため、`score_anchors` が抽象語だけで成立してしまう。結果として、full-harness のスコアは高くても、業界基準から見れば低品質な UI が通過する。

### Root causes

1. `qfai-discussion` の手順に、Material Design / WCAG / Apple HIG / 採用 UI ライブラリ等を調査する必須サブステップがない。
2. `04_Sources.md` の Trend Scan で、design guideline research を格納する canonical category が不足している。
3. `21_design_eval_trend_derived.md` の `score_anchors` に、px 値、比率、ルール ID、クラス名などの定量基準を要求していない。
4. `qfai-validate` に、TRD anchors の concreteness と Trend Scan の guideline coverage を検査する rule がない。

## Stakeholders

| Stakeholder | 関心 |
| --- | --- |
| QFAI パッケージ利用者 | 議論段階で品質基準が落ちず、後続 prototyping が適切にブロックされること |
| QFAI パッケージ開発者 | 既存テンプレートと validator に整合した改善であること |
| UI-bearing プロジェクトの依頼者 | 業界基準を満たす UI 品質が自動ワークフローで担保されること |
| completion-reviewer | 15ファイル、open OQ 0、Drift Protocol、review pack の完全性 |
| requirements-reviewer | REQ/NFR の明確性、過剰設計回避、安全な deferred |
| architecture-reviewer | validator/template/skill の境界と後方互換性 |

## Target Users

- Primary: `qfai-discussion` と `qfai-validate` を利用する AI agent
- Secondary: `packages/qfai/` を保守する開発者

## Assumptions

1. 問題再発防止には、discussion で定量基準を明文化し validator で検査する二段構えが必要である。
2. デザイン指南書は外部参照として動的にリサーチさせる方が、静的ルール集を package に埋め込むより適切である。
3. 今回の discussion は package 改善方針の合意形成が目的であり、実装詳細やテストコードの最終形は `/qfai-sdd` 以降で詰める。
4. architecture 影響はあるが、UI runtime 実装そのものはスコープ外である。

## Measurable Goal

- `qfai-discussion` が UI-bearing pack で design guideline research を必須化する。
- `04_Sources.md` と `21_design_eval_trend_derived.md` に定量根拠を保持する構造を追加する。
- `qfai-validate` が不足を warning 以上で検出できる。
- この discussion pack の `11_OQ-Register.md` で `Disposition: open` を 0 にする。

## Initial Interview Summary

今回の入力は単一の詳細レポートであり、対話インタビューの代わりに以下を明示的な初期回答として採用する。

- Concept: package-level fix for discussion and validator quality gates
- Scope: skill/template/validator improvement
- Stakeholders: package users, package maintainers, downstream UI projects
- Constraints: `.qfai/` の運用成果物ではなく `packages/qfai/` を修正対象とする
- Outstanding decisions: validator severity、mandatory research coverage の最終閾値、後方互換ポリシー
