# 01_Context

## Background

QFAI v1.5.7 では、UI/UX・画面デザイン・画面遷移・導線設計の定義体系を抜本的に強化する。現状、UI 定義は `.qfai/contracts/ui/` の YAML ベースの UI Contract（`CON-UI-XXXX`）と、`spec-0006` の prototyping コマンド仕様のみである。構造的な情報（screens, elements, actions）は定義できているが、以下が欠落している：

1. **ビジュアル情報**: 色、タイポグラフィ、スペーシング、レイアウトの具体的な見た目
2. **画面遷移の全体設計**: 画面間の遷移フロー、条件分岐、ナビゲーション構造
3. **UX フロー/導線**: ユーザージャーニー、タスクフロー、エラーリカバリーフロー
4. **プラットフォーム横断対応**: Web 以外（Windows アプリ、モバイルアプリ）への対応
5. **UI/UX 品質基準**: ベストプラクティス/アンチパターンに基づくレビュー基準
6. **下流 skill 連携**: discussion/specs の UI 定義を prototyping/ATDD/TDD が正確に消費する仕組み

## Purpose

v1.5.7 で以下を実現する：

- UI/UX ベストプラクティスとアンチパターンを体系化し、レビュー基準として組み込む
- HTML+CSS mock + Mermaid 画面遷移図 + Design Token YAML の 3 点セットで UI 定義を保持する
- discussion-pack / spec-pack の UI 定義を下流 skill（prototyping, ATDD, TDD）が正確に理解・実装できる仕組みを構築する
- プラットフォーム非依存・時代適応型の柔軟な設計とする

## Stakeholders

| Role | Responsibility |
|------|---------------|
| User (Product Owner) | 要件定義、UI/UX 方針決定、最終承認 |
| QFAI Agent (Orchestrator) | discussion/spec 生成、レビュー実行、専門家サブエージェント統括 |
| UI/UX Expert (Sub-agent) | ユーザビリティ評価・認知負荷分析・情報設計・インタラクション設計。作業冒頭でベストプラクティス/アンチパターンのリサーチを必須実施し、最新トレンドを把握 |
| Design Expert (Sub-agent) | ビジュアルデザイン・色彩・タイポグラフィ・レイアウト・Design Token 設計。作業冒頭でベストプラクティス/アンチパターンのリサーチを必須実施し、最新トレンドを把握 |
| Screen Transition Expert (Sub-agent) | 画面遷移フロー設計・状態管理・条件分岐・エラー/例外遷移・ディープリンク。作業冒頭でベストプラクティス/アンチパターンのリサーチを必須実施し、最新トレンドを把握 |
| Navigation Expert (Sub-agent) | IA（情報アーキテクチャ）構造設計・メニュー/タブ/サイドバー設計・ブレッドクラム・導線最適化・ファネル設計。作業冒頭でベストプラクティス/アンチパターンのリサーチを必須実施し、最新トレンドを把握 |
| Integrated UI/UX Reviewer (Sub-agent) | 4専門家の成果物を統合的にレビュー。個別の UI/UX・デザイン評価に加え、サービス全体の使い勝手の良さを統合的に評価。作業冒頭でベストプラクティス/アンチパターンのリサーチを必須実施。review-roster 13番目 |
| Frontend Reviewer (Agent) | 実装可能性、技術的整合性チェック |
| Downstream Skills | prototyping, ATDD, TDD skill が UI 定義を消費 |

## Assumptions

1. QFAI は CLI ツールであり、自身の UI は持たない（対象プロジェクトの UI を定義・検証する）
2. 対象プロジェクトの技術スタックは固定しない（Web/Windows/Mobile、あらゆる FW に対応）
3. UI/UX のベストプラクティスは時代とともに変化するため、固定的なルールセットではなく、都度調査・更新可能な設計とする
4. `qfai validate` による自動チェックと、review-roster の手動レビューのハイブリッドで品質を担保する
5. 既存の UI Contract YAML フォーマット（`CON-UI-XXXX`）は拡張するが、破壊的変更は避ける

## Issues

1. 現在の YAML ベースの UI Contract ではビジュアル情報（見た目）が欠落している
2. 画面遷移の全体像を俯瞰する仕組みがない
3. プロトタイプ実装時に仕様との認識齟齬が発生するリスクがある
4. UI/UX レビューの基準が明確に定義されていない
5. 下流 skill が UI 定義を正確に解釈・実装するプロトコルが未整備
6. プラットフォーム横断での UI/UX 品質基準が未整備
7. UI/UX 各専門領域（ユーザビリティ、ビジュアルデザイン、画面遷移、導線設計）に特化した専門家サブエージェントが未定義
8. 専門家サブエージェントが最新のベストプラクティス/アンチパターンを作業冒頭でリサーチする仕組みが未整備
9. 個別の UI/UX 評価だけでなくサービス全体の使い勝手を統合的に評価する仕組みが未整備
