# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0002-0001
Scenario: discussion-pack が 15 必須ファイルを含む
  Given discussion-pack ディレクトリが存在する
  When 必須ファイルを検証する
  Then 01_Context.md から 99_delta.md までの 15 ファイルが存在する
```

```gherkin
# AC-0002-0002
Scenario: 命名不正のディレクトリが検出される
  Given discussion 配下に命名不正のディレクトリがある
  When QFAI-DPACK-005 バリデータが実行される
  Then error が出力される
```

```gherkin
# AC-0002-0003
Scenario: 最小コンテンツ要件を満たさないファイルが検出される
  Given discussion-pack の一部ファイルが 100 文字未満または TBD のみ
  When QFAI-DPACK-003 バリデータが実行される
  Then error が出力され、不十分なファイル名が列挙される
```

```gherkin
# AC-0002-0004
Scenario: Blocking OQ が残っている場合にエラー
  Given 11_OQ-Register.md に Disposition: open の OQ がある
  When QFAI-DPACK-004 バリデータが実行される
  Then error が出力され、blocking OQ ID が列挙される
```

```gherkin
# AC-0002-0005
Scenario: 03_Story-Workshop.md に Mermaid diagram が存在する
  Given discussion-pack の 03_Story-Workshop.md を検査する
  When Mermaid block の有無を検証する
  Then 少なくとも 1 つの mermaid fenced block が存在する
```

```gherkin
# AC-0002-0006
Scenario: UI-bearing パック検出時に DDS バリデータが起動する
  Given HTML mock を含む discussion pack
  When UI-bearing 検出ロジックが実行される
  Then パックが UI-bearing と分類され、DDS バリデータが適用される
```

```gherkin
# AC-0002-0007
Scenario: 非 UI パックが DDS チェックをバイパスする
  Given HTML mock も Mermaid screen flow も含まない discussion pack
  When UI-bearing 検出が実行される
  Then パックが non-UI と分類され、DDS バリデータは適用されない
  And 新規 validation issue はゼロ
```

```gherkin
# AC-0002-0008
Scenario: Explicit surface classification が content signal を override する
  Given explicit surface classification: non-ui が設定されている
  And content signal は UI 存在を示唆する
  When UI-bearing 検出が実行される
  Then explicit classification に基づき non-ui と判定される
```

```gherkin
# AC-0002-0009
Scenario: UI-bearing パックで uiux/ サイドカー 11 ファイルが生成される（3-layer canonical family）
  Given UI-bearing プロジェクトが検出される
  When qfai-discussion が完了する
  Then uiux/ ディレクトリに 11 ファイル（00_index, 10_strategy, 11_design_taste_interview, 20_design_eval_invariant, 21_design_eval_trend_derived, 22_design_eval_product_specific, 23_design_eval_aggregate, 24_design_eval_dynamic_overrides, 30_comparison, 40_contracts, 50_review_bundle）が生成される
  And 旧 4-axis ファイル（20_eval_axis_*.md）は存在しない
```

```gherkin
# AC-0002-0010
Scenario: 非 UI プロジェクトでサイドカーがスキップされる
  Given surface classification が non-ui
  When qfai-discussion が完了する
  Then uiux/ ディレクトリは生成されない
  And エラーは出力されない
```

```gherkin
# AC-0002-0011
Scenario: 3-layer モデルが新規パックに適用される
  Given 新規 UI-bearing discussion pack
  When サイドカー評価軸を検査する
  Then 全軸が invariant / trend-derived / product-specific に分類されている
```

```gherkin
# AC-0002-0012
Scenario: Legacy 4-axis ファイルが active sidecar に存在する場合にエラー
  Given uiux/ ディレクトリに 20_eval_axis_usability.md が存在する
  When qfai validate を実行する
  Then error が報告され、旧 4-axis ファイルの削除指示が含まれる
  And 3-layer canonical family への移行ガイダンスが含まれる
```

```gherkin
# AC-0002-0013
Scenario: scoring-ready schema の 16 フィールドが全軸に存在する
  Given UI-bearing discussion pack with 3-layer model
  When scoring-ready axis artifacts を検査する
  Then 各軸に 16 フィールドが存在する
```

```gherkin
# AC-0002-0014
Scenario: strategy artifact が 8 フィールドを含む
  Given UI-bearing discussion pack
  When uiux/10_strategy を検査する
  Then 8 フィールド（surface, selection_required, decision, candidate_options, chosen_option, rationale, verification_expectations, notes_for_reviewer）が存在する
```

```gherkin
# AC-0002-0015
Scenario: screen contract が 10 フィールドを含む
  Given UI-bearing discussion pack
  When uiux/40_contracts を検査する
  Then 各 screen entry に 10 フィールドが存在する
```

```gherkin
# AC-0002-0016
Scenario: design taste interview が 10 セクションを含む
  Given UI-bearing discussion pack
  When uiux/11_design_taste_interview.md を検査する
  Then 10 セクション全てが非空コンテンツを含む
```

```gherkin
# AC-0002-0017
Scenario: trend scan が freshness metadata を含む
  Given UI-bearing discussion pack
  When 04_Sources.md の trend scan を検査する
  Then 各 trend reference に freshness_date, confidence, source_translation が存在する
```

```gherkin
# AC-0002-0018
Scenario: deferred OQ が 13_Deferred.md に記載されている
  Given 11_OQ-Register.md に deferred OQ がある
  When QFAI-DPACK-007 バリデータが実行される
  Then 13_Deferred.md に同一 OQ-ID が記載されていなければ error
```

```gherkin
# AC-0002-0019
Scenario: 旧 4-axis テンプレートファイルが active sidecar に不在
  Given UI-bearing パックの uiux/ ディレクトリ
  When サイドカーファイル一覧を検査する
  Then 20_eval_axis_usability.md, 21_eval_axis_consistency.md, 22_eval_axis_accessibility.md, 23_eval_axis_delight.md のいずれも存在しない
  And 31_anchor.md は存在しない
  And 60_critique_loop.md は存在しない
```

```gherkin
# AC-0002-0020
Scenario: 00_index.md が 3-layer canonical file family を反映
  Given UI-bearing パックの uiux/00_index.md
  When ファイル内容を検査する
  Then 11 ファイルの canonical file list（00_index ~ 50_review_bundle）が記載されている
  And 旧 4-axis ファイル名への参照が含まれない
```

```gherkin
# AC-0002-0021
Scenario: 30_comparison.md が旧 31_anchor.md を置換
  Given UI-bearing パックの uiux/ ディレクトリ
  When サイドカーファイル一覧を検査する
  Then 30_comparison.md が存在する
  And 31_anchor.md は存在しない
```

```gherkin
# AC-0002-0022
Scenario: 24_design_eval_dynamic_overrides.md が新ファミリに含まれる
  Given UI-bearing パックの uiux/ ディレクトリ
  When サイドカーファイル一覧を検査する
  Then 24_design_eval_dynamic_overrides.md が存在し、3-layer model 準拠の構造を持つ
```

```gherkin
# AC-0002-0023
Scenario: prototyping.yaml 必須チェック
  Given discussion-pack が存在する
  And prototyping.yaml が欠落している
  When discussion-pack readiness チェックを実行する
  Then missingSideArtifacts に "prototyping.yaml" が含まれる
  And QFAI-DPACK-002 が emit される
```

```gherkin
# AC-0002-0024
Scenario: DDS バリデータ canonical コード
  Given UI-bearing discussion-pack が存在する
  When canonical UIX validation を実行する
  Then issue codes が UIX-VAL-DDH-* 形式で emit される（旧 QFAI-DDP-019~025 ではない）
```

## AC Catalog (optional)

| AC_ID        | Title                            | Notes         | Priority |
| ------------ | -------------------------------- | ------------- | -------- |
| AC-0002-0001 | 15 必須ファイル                  | REQ-0001      | P1       |
| AC-0002-0002 | 命名不正検出                     | REQ-0002      | P1       |
| AC-0002-0003 | 最小コンテンツ要件               | REQ-0003      | P1       |
| AC-0002-0004 | Blocking OQ 検出                 | REQ-0004      | P1       |
| AC-0002-0005 | Mermaid diagram 必須             | REQ-0006      | P1       |
| AC-0002-0006 | UI-bearing DDS 起動              | REQ-0007,0008 | P1       |
| AC-0002-0007 | Non-UI bypass                    | REQ-0007      | P1       |
| AC-0002-0008 | Explicit classification override | REQ-0007      | P1       |
| AC-0002-0009 | Sidecar 11 ファイル (3-layer)    | REQ-0010,0018 | P1       |
| AC-0002-0010 | Non-UI sidecar skip              | REQ-0010      | P1       |
| AC-0002-0011 | 3-layer model                    | REQ-0011      | P1       |
| AC-0002-0012 | 4-axis active path error         | REQ-0011,0018 | P1       |
| AC-0002-0013 | scoring-ready 16 fields          | REQ-0012      | P1       |
| AC-0002-0014 | strategy 8 fields                | REQ-0013      | P1       |
| AC-0002-0015 | screen contract 10 fields        | REQ-0014      | P1       |
| AC-0002-0016 | taste interview 10 sections      | REQ-0015      | P1       |
| AC-0002-0017 | trend scan freshness             | REQ-0016      | P1       |
| AC-0002-0018 | deferred OQ coverage             | REQ-0005      | P1       |
| AC-0002-0019 | 旧 4-axis ファイル不在           | REQ-0018      | P1       |
| AC-0002-0020 | 00_index canonical 反映          | REQ-0019      | P1       |
| AC-0002-0021 | 30_comparison 置換               | REQ-0018      | P1       |
| AC-0002-0022 | dynamic_overrides 存在           | REQ-0010      | P1       |
| AC-0002-0023 | prototyping.yaml 必須チェック    | REQ-0020      | P1       |
| AC-0002-0024 | DDS canonical コード             | REQ-0021      | P1       |
