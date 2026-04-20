# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                               | AC-Refs                    | Rule                                                                                                                                                                                                                                                                             | Notes                                  | NFR-Refs |
| ------------ | ----------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| BR-0002-0001 | 15 ファイル必須構成                 | AC-0002-0001               | discussion-pack は 01_Context.md ~ 99_delta.md の 15 ファイルを必須とする                                                                                                                                                                                                        | QFAI-DPACK-002 で検証                  |          |
| BR-0002-0002 | 命名規則                            | AC-0002-0002               | discussion-pack ディレクトリは `discussion-YYYYMMDDhhmmssSSS` 形式のみ許可                                                                                                                                                                                                       | QFAI-DPACK-005 で検証                  |          |
| BR-0002-0003 | 最小コンテンツ 100 文字             | AC-0002-0003               | 各必須ファイルは 100 文字以上の本文を含む。見出しだけ、TBD/TODO/placeholder のみは不可                                                                                                                                                                                           | QFAI-DPACK-003 で検証                  | NFR-0003 |
| BR-0002-0004 | Blocking OQ ゼロ exit               | AC-0002-0004               | 11_OQ-Register.md の Disposition: open が 0 件で SDD ハンドオフ可能                                                                                                                                                                                                              | QFAI-DPACK-004 で検証                  |          |
| BR-0002-0005 | Deferred → 13_Deferred 整合         | AC-0002-0018               | OQ Register で deferred にした OQ は 13_Deferred.md に同一 OQ-ID で記載しなければならない                                                                                                                                                                                        | QFAI-DPACK-007 で検証                  |          |
| BR-0002-0006 | Mermaid diagram 必須                | AC-0002-0005               | 03_Story-Workshop.md に少なくとも 1 つの mermaid fenced block を含める                                                                                                                                                                                                           | QFAI-DPACK-008 で検証                  |          |
| BR-0002-0007 | UI-bearing surface classification   | AC-0002-0006, AC-0002-0008 | surface type（web, mobile, desktop, mixed, non-ui）のみで UI-bearing を判定。explicit classification が primary SSOT（01_Context.md の classification block）、content signals はフォールバック                                                                                  | 旧 spec-0023 DR-0042, DR-0082 に基づく |          |
| BR-0002-0008 | DDS セクション必須                  | AC-0002-0006               | UI-bearing パックは 03_Story-Workshop.md に Design Direction Summary セクションを含む                                                                                                                                                                                            | QFAI-DDP-019 で検証                    | NFR-0003 |
| BR-0002-0009 | DDS option comparison >= 2          | AC-0002-0006               | DDS に 2 つ以上のデザインオプション比較を含む                                                                                                                                                                                                                                    | QFAI-DDP-020 で検証                    |          |
| BR-0002-0010 | DDS anchor screen 必須              | AC-0002-0006               | DDS にアンカースクリーン選択を含む                                                                                                                                                                                                                                               | QFAI-DDP-021 で検証                    |          |
| BR-0002-0011 | Competitive ref 3 fields            | AC-0002-0006               | 競合参考 UI は adopted_points, rejected_points, local_translation の 3 フィールド必須                                                                                                                                                                                            | QFAI-DDP-022 で検証                    |          |
| BR-0002-0012 | CTA hierarchy 必須                  | AC-0002-0006               | UI-bearing パックは primary CTA を含む CTA hierarchy を定義する                                                                                                                                                                                                                  | QFAI-DDP-023 で検証                    |          |
| BR-0002-0013 | State coverage 4 states             | AC-0002-0006               | empty, loading, error, populated の 4 状態を定義する                                                                                                                                                                                                                             | QFAI-DDP-024 で検証                    |          |
| BR-0002-0014 | Design anti-goals >= 1              | AC-0002-0006               | 少なくとも 1 つの design anti-goal を定義する                                                                                                                                                                                                                                    | QFAI-DDP-025 で検証                    |          |
| BR-0002-0015 | Non-UI パック影響ゼロ               | AC-0002-0007, AC-0002-0010 | 非 UI パックに対して DDS バリデータは起動せず、サイドカーも生成しない                                                                                                                                                                                                            |                                        | NFR-0002 |
| BR-0002-0016 | Sidecar 11 ファイル完全性 (3-layer) | AC-0002-0009               | UI-bearing 検出時、uiux/ に 3-layer canonical family の 11 ファイル全てを生成（24_design_eval_dynamic_overrides.md は OPTIONAL）。部分生成は不可。旧 4-axis ファイルは生成しない                                                                                                 | 00_index ~ 50_review_input_bundle      |          |
| BR-0002-0017 | 3-layer definitions                 | AC-0002-0011               | invariant: 普遍的 UX 原則、trend-derived: trend research 由来、product-specific: プロダクト固有。3 カテゴリは網羅的かつ相互排他                                                                                                                                                  | 旧 spec-0034 統合元BR                  | NFR-0005 |
| BR-0002-0018 | 4-axis 完全削除                     | AC-0002-0012, AC-0002-0019 | v1.7.12: 旧 4-axis テンプレートファイル（20_eval_axis_usability.md, 21_eval_axis_consistency.md, 22_eval_axis_accessibility.md, 23_eval_axis_delight.md）が active sidecar path に存在する場合は即時 error。migration window は終了                                              | D-004 決定に基づく                     | NFR-0005 |
| BR-0002-0019 | Scoring-ready 16 field names        | AC-0002-0013               | 16 必須フィールド: axis_id, axis_name, layer, definition, rationale, scoring_rubric, weight, min_score, max_score, pass_threshold, evidence_type, evidence_source, review_prompt, calibration_anchor, dependencies, review_questions                                             | 旧 spec-0034 統合元BR                  |          |
| BR-0002-0020 | Strategy 8 field names              | AC-0002-0014               | 8 必須フィールド: surface, selection_required, decision, candidate_options, chosen_option, rationale, verification_expectations, notes_for_reviewer                                                                                                                              | 旧 spec-0034 統合元BR                  |          |
| BR-0002-0021 | Strategy selection_required         | AC-0002-0014               | selection_required=true 時、candidate_options >= 2 かつ chosen_option が候補の 1 つを参照                                                                                                                                                                                        | 旧 spec-0034 統合元BR                  |          |
| BR-0002-0022 | Screen contract 11 field names      | AC-0002-0015               | 11 必須フィールド: screen_id, route, purpose, actor, primary_tasks, secondary_tasks, required_states, transitions, observable_outcomes, notes_for_verify, notes_for_reviewer                                                                                                     | 旧 spec-0034 統合元BR                  |          |
| BR-0002-0023 | Screen contract multi-screen array  | AC-0002-0015               | screen contracts は screen object の配列。各 screen は独立検証、cross-screen screen_id 一意性を強制                                                                                                                                                                              | 旧 spec-0034 統合元BR                  |          |
| BR-0002-0024 | Taste interview 10 sections         | AC-0002-0016               | 10 セクション: visual_character, emotional_tone, anti_preferences, admired_rejected_references, novelty_vs_safety, density_hierarchy, motion_material, brand_tone, taste_reflection_depth, unresolved_taste_questions                                                            | 旧 spec-0034 統合元BR                  |          |
| BR-0002-0025 | Trend scan freshness                | AC-0002-0017               | 各 trend reference は freshness_date, confidence, source_translation を含む                                                                                                                                                                                                      | 旧 spec-0034 統合元BR~0007             |          |
| BR-0002-0026 | All DDS validators emit error       | AC-0002-0006               | QFAI-DDP-019~025 の全バリデータは severity "error" を出力する                                                                                                                                                                                                                    | 旧 spec-0023 AC-0023-0019              |          |
| BR-0002-0027 | 旧ファイル forbidden                | AC-0002-0019               | uiux/ ディレクトリに 20_eval_axis_usability.md, 21_eval_axis_consistency.md, 22_eval_axis_accessibility.md, 23_eval_axis_delight.md のいずれかが存在する場合は error。31_anchor.md, 60_critique_loop.md, 30_comparison.md, 40_contracts.md, 50_review_bundle.md も同様           | D-004、REQ-0018                        | NFR-0005 |
| BR-0002-0028 | 00_index.md canonical file list     | AC-0002-0020               | uiux/00_index.md は 3-layer canonical family の 11 ファイル一覧を記載しなければならない。旧 4-axis ファイル名への参照を含んではならない                                                                                                                                          | D-001、REQ-0019                        | NFR-0005 |
| BR-0002-0029 | canonical file rename               | AC-0002-0021               | 旧 31_anchor.md は 31_selected_anchor_screen.md にリネーム。旧 30_comparison.md は 30_option_comparison.md にリネーム。旧 40_contracts.md は 40_screen_contracts.md にリネーム。旧 50_review_bundle.md は 50_review_input_bundle.md にリネーム。旧ファイルが存在する場合は error | D-004                                  |          |
| BR-0002-0030 | 3-layer family SSOT                 | AC-0002-0011, AC-0002-0022 | 3-layer canonical family が uiux/ サイドカーの唯一の評価テンプレート構造である。invariant（20）/ trend-derived（21）/ product-specific（22）/ aggregate（23）は必須、dynamic-overrides（24）は OPTIONAL                                                                          | D-001、NFR-0005                        | NFR-0005 |

## BR-0002-0031: prototyping.yaml as Side Artifact

- AC-Refs: AC-0002-0023

- prototyping.yaml は discussion-pack の必須サイドアーティファクトであり、15 markdown ファイルとは別に存在チェックされる
- 欠落時は missingSideArtifacts フィールドに記録され、QFAI-DPACK-002 issue で報告される
- 必須フィールド: recommended_mode, rationale, allowed_modes, surface

## BR-0002-0032: Canonical Issue Code Migration

- AC-Refs: AC-0002-0024

- DDS バリデータは canonical UIX-VAL-DDH-\* コードを使用する
- 旧 QFAI-DDP-019~025 コードは v1.7.14 で完全削除（legacy/ ディレクトリ自体が削除済み。DR-0115）
- Sidecar-first 読み取り順序: uiux/30_option_comparison.md → uiux/31_selected_anchor_screen.md → uiux/10_strategy.md → uiux/11_design_taste_interview.md → 04_Sources → uiux/20-23 (+ optional 24) → uiux/40_screen_contracts.md → uiux/50_review_input_bundle.md を primary source とする

## BR-0002-0033: DDH Validator Sidecar Source Mapping

- AC-Refs: AC-0002-0024

- v1.7.13 の sidecar-first rewrite により、各 DDH validator の読み取り先が変更された:
  - UIX-VAL-DDH-SIDECAR-PRIMARY-TRUTH: uiux/10_strategy.md, uiux/30_option_comparison.md, uiux/31_selected_anchor_screen.md, uiux/40_screen_contracts.md の存在チェック
  - UIX-VAL-DDH-OPTION-COMPARISON: uiux/30_option_comparison.md で 2+ オプション比較チェック
  - UIX-VAL-DDH-SELECTED-ANCHOR: uiux/31_selected_anchor_screen.md の `## Selected Anchor` セクション + `Selected:` 宣言チェック（v1.7.14: DDH-SELECTED-DIRECTION → DDH-SELECTED-ANCHOR にリネーム）
  - UIX-VAL-DDH-COMPETITIVE-REFERENCES: 04_Sources.md の競合参考チェック
  - UIX-VAL-DDH-INTERACTION-HANDOFF: 03_Story-Workshop.md の `## Behavior Obligations` → `Interaction Contracts` サブセクション、fallback は全セクション内容
  - UIX-VAL-DDH-STATE-COVERAGE: 03_Story-Workshop.md の `## Behavior Obligations` で state-risk discovery signal + uiux/40_screen_contracts.md へのハンドオフ
  - UIX-VAL-DDH-DESIGN-ANTI-GOALS: 03_Story-Workshop.md の `## Behavior Obligations` を primary、fallback は uiux/30_option_comparison.md
- 旧コードマッピング: QFAI-DDP-019→DDH-SIDECAR-PRIMARY-TRUTH, 020→DDH-OPTION-COMPARISON, 021→DDH-SELECTED-ANCHOR（v1.7.14 リネーム）, 022→DDH-COMPETITIVE-REFERENCES, 023→DDH-INTERACTION-HANDOFF, 024→DDH-STATE-COVERAGE, 025→DDH-DESIGN-ANTI-GOALS

## BR-0002-0034: Screen Contract Nested Bullet Format

- AC-Refs: AC-0002-0015

- v1.7.13 で screen contract の 4 nested fields（primary_tasks, required_states, transitions, observable_outcomes）は indented child list 形式（canonical）を primary format とする
- CSV inline 形式は backward-compatibility fallback として引き続きパース可能
- parseScreenBlocks() は section-aware parsing で canonical/legacy 両形式をサポート

## BR-0002-0035: Strategy Nested Bullet Format

- AC-Refs: AC-0002-0014

- v1.7.13 で strategy の candidate_options フィールドは nested bullet list 形式（canonical）を primary format とする
- CSV inline 形式は backward-compatibility fallback として引き続きパース可能
- parseStrategyFields() は Array.length（nested）と CSV split（legacy）の両方で selection_required count を計算

## BR-0002-0036: State Coverage Required States (v1.7.13)

- AC-Refs: AC-0002-0006

- v1.7.13 で state coverage の必須状態セットが変更された:
  - 旧: ["empty", "loading", "error", "populated"]
  - 新: ["default", "loading", "empty", "error"]
- "default" は初期表示状態、"populated" は "default" に包含される概念として整理
- 検証は word boundary マッチ（行頭アンカーではなくセクション内の任意位置）に緩和

## BR-0002-0037: Review Request Selected Anchor Enforcement

- AC-Refs: AC-0002-0024

- 14_Review-Request.md の "Design Direction Decisions" セクションは "Selected Anchor" を含まなければならない（v1.7.14: "Selected Direction" → "Selected Anchor" にリネーム）
- テンプレート更新: 03_Story-Workshop.md から "Behavior Obligations" セクション構造に移行
