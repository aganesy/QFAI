# 02 User Stories

## US Catalog

- US-0002-0001: 15 ファイル discussion-pack 構造検証
- US-0002-0002: UI-bearing 検出と DDS バリデーション
- US-0002-0003: uiux/ サイドカー 11 ファイル生成
- US-0002-0004: 3-layer 評価モデル収束
- US-0002-0005: scoring-ready schema 強化
- US-0002-0006: strategy artifact 強化
- US-0002-0007: screen contract 強化
- US-0002-0008: design taste interview
- US-0002-0009: trend/reference research 必須化
- US-0002-0010: discussion-to-SDD ハンドオフ
- US-0002-0011: サイドカーテンプレートファミリ置換（4-axis → 3-layer）
- US-0002-0012: 00_index.md canonical 書き換え
- US-0002-0013: prototyping.yaml Required Side Artifact
- US-0002-0014: Canonical Validator Code Migration

## US-0002-0001: 15 ファイル discussion-pack 構造検証

- Parent: CAP-0002
- Goal: discussion-pack が 15 必須ファイル（01_Context ~ 99_delta）を含み、命名規則（discussion-YYYYMMDDhhmmssSSS）に準拠し、最小コンテンツ要件を満たすことを検証する
- Non-goals: ファイルコンテンツの品質評価
- Notes: REQ-0001~0006 準拠。validateDiscussionPackReadiness() として実装済み。QFAI-DPACK-001~008 バリデータ

## US-0002-0002: UI-bearing 検出と DDS バリデーション

- Parent: CAP-0002
- Goal: UI アーティファクトを含むパックを自動検出し、7 件の DDS バリデータ（QFAI-DDP-019~025）を適用する。非 UI パックには影響しない
- Non-goals: ヒューリスティック/美的チェック、Figma 連携
- Notes: REQ-0007~0009 準拠。統合元由来。Surface classification が primary SSOT、content signals はフォールバック

## US-0002-0003: uiux/ サイドカー 11 ファイル生成

- Parent: CAP-0002
- Goal: UI-bearing プロジェクトで qfai-discussion 実行時に uiux/ サイドカー（11 ファイル: 00_index ~ 50_review_input_bundle）を生成する。非 UI プロジェクトではスキップ
- Non-goals: バリデータによるサイドカー自動検証（v1.7.4 以降）、ブラウザベースのレンダリング証跡
- Notes: REQ-0010 準拠。v1.7.12 で 3-layer canonical family に置換。旧 4-axis ファイル（20*eval_axis*\*.md）および 60_critique_loop.md は除外

## US-0002-0004: 3-layer 評価モデル収束

- Parent: CAP-0002
- Goal: 評価軸モデルを invariant / trend-derived / product-specific の 3-layer に統一し、4-axis legacy（usability/consistency/accessibility/delight）を完全削除する
- Non-goals: 旧 4-axis への後方互換（v1.7.12 で migration window 終了）
- Notes: REQ-0011, REQ-0018 準拠。D-001, D-004 決定に基づく。v1.7.12 で 4-axis テンプレートを active path から完全排除

## US-0002-0005: scoring-ready schema 強化

- Parent: CAP-0002
- Goal: 全評価軸が scoring-ready schema（16 fields per axis）を持ち、aggregate scoring rules を定義する
- Non-goals: 自動スコアリング実行、score-based gating
- Notes: REQ-0012 準拠。統合元由来

## US-0002-0006: strategy artifact 強化

- Parent: CAP-0002
- Goal: strategy artifact が strong universal schema（8 fields）を使用し、selection_required / candidate_options / chosen_option / verification_expectations を保証する
- Non-goals: 自動 strategy 選択
- Notes: REQ-0013 準拠。統合元由来

## US-0002-0007: screen contract 強化

- Parent: CAP-0002
- Goal: screen contract が 11 fields (secondary_tasks 含む), multi-screen 対応 schema を持つ
- Non-goals: ランタイム screen contract enforcement
- Notes: REQ-0014 準拠。統合元由来

## US-0002-0008: design taste interview

- Parent: CAP-0002
- Goal: UI-bearing プロジェクトの discussion で 10 セクションの design taste interview を必須ステップとして実行する
- Non-goals: 非 UI プロジェクトでの実行、自動回答生成
- Notes: REQ-0015 準拠。統合元由来

## US-0002-0009: trend/reference research 必須化

- Parent: CAP-0002
- Goal: UI-bearing プロジェクトの discussion で trend/reference research を必須ステップとし、freshness metadata を確保する
- Non-goals: 外部 API による自動 trend scanning
- Notes: REQ-0016 準拠。統合元由来

## US-0002-0010: discussion-to-SDD ハンドオフ

- Parent: CAP-0002
- Goal: discussion-pack 完了後の SDD フェーズへのハンドオフ要件（OQ exit、Review pass、必須ファイル充足）を定義する
- Non-goals: SDD フェーズの内部処理
- Notes: REQ-0017 準拠。discussionPack.ts の readiness チェックが実装

## US-0002-0011: サイドカーテンプレートファミリ置換（4-axis → 3-layer）

- Parent: CAP-0002
- Goal: uiux/ サイドカーの旧 4-axis テンプレートファイル（20_eval_axis_usability.md, 21_eval_axis_consistency.md, 22_eval_axis_accessibility.md, 23_eval_axis_delight.md）を active path から完全削除し、
  3-layer canonical family（20_design_eval_invariant.md, 21_design_eval_trend_derived.md, 22_design_eval_product_specific.md, 23_design_eval_aggregate.md, 24_design_eval_dynamic_overrides.md）に置換する。
  31_anchor.md は 31_selected_anchor_screen.md にリネーム、30_comparison.md は 30_option_comparison.md にリネーム、40_contracts.md は 40_screen_contracts.md にリネーム、50_review_bundle.md は 50_review_input_bundle.md にリネーム
- Non-goals: 旧ファイルの自動マイグレーション
- Notes: REQ-0018 準拠。D-004 決定に基づく。60_critique_loop.md も新ファミリから除外

## US-0002-0012: 00_index.md canonical 書き換え

- Parent: CAP-0002
- Goal: uiux/00_index.md のファイル一覧・構造説明を 3-layer canonical sidecar family に準拠した内容に書き換える
- Non-goals: 00_index.md 以外のサイドカーファイル内容の書き換え
- Notes: REQ-0019 準拠。D-001 決定に基づく。新ファイル一覧: 00_index, 10_strategy, 11_design_taste_interview, 20_design_eval_invariant,
  21_design_eval_trend_derived, 22_design_eval_product_specific, 23_design_eval_aggregate, 24_design_eval_dynamic_overrides (OPTIONAL),
  30_option_comparison, 31_selected_anchor_screen, 40_screen_contracts, 50_review_input_bundle

## US-0002-0013: prototyping.yaml Required Side Artifact

As a discussion-pack author, I want prototyping.yaml to be a required side artifact alongside the 15 markdown files, so that prototyping mode recommendation is structurally captured and validated during SDD preflight.

## US-0002-0014: Canonical Validator Code Migration

As a QFAI maintainer, I want DDS validators to use canonical UIX-VAL-DDH-\* issue codes instead of legacy QFAI-DDP-019~025, so that the sidecar-first model is reflected in issue taxonomy.
