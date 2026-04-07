# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                                       | Expected                                                     | Notes                         |
| ------------ | ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| EX-0002-0001 | BR-0002-0001 | discussion-pack に 15 ファイルが存在                                                        | QFAI-DPACK-002 が pass                                       | Happy: 全ファイル充足         |
| EX-0002-0002 | BR-0002-0001 | discussion-pack に 03_Story-Workshop.md が不足                                              | QFAI-DPACK-002 が error、不足ファイル名が列挙                | Negative: ファイル不足        |
| EX-0002-0003 | BR-0002-0002 | `discussion-abc123` ディレクトリが存在                                                      | QFAI-DPACK-005 が error                                      | Negative: 命名不正            |
| EX-0002-0004 | BR-0002-0003 | ファイルが見出しのみで 50 文字                                                              | QFAI-DPACK-003 が error                                      | Negative: コンテンツ不足      |
| EX-0002-0005 | BR-0002-0004 | OQ-001 が Disposition: open                                                                 | QFAI-DPACK-004 が error、OQ-001 が列挙                       | Negative: blocking OQ         |
| EX-0002-0006 | BR-0002-0005 | OQ-002 が deferred だが 13_Deferred.md に記載なし                                           | QFAI-DPACK-007 が error                                      | Negative: deferred 不整合     |
| EX-0002-0007 | BR-0002-0006 | 03_Story-Workshop.md に mermaid block あり                                                  | QFAI-DPACK-008 が pass                                       | Happy: Mermaid あり           |
| EX-0002-0008 | BR-0002-0007 | HTML style tag を含む pack、explicit classification なし                                    | UI-bearing と分類、DDS バリデータ起動                        | Happy: UI-bearing 検出        |
| EX-0002-0009 | BR-0002-0007 | explicit surface classification: non-ui + HTML style tag あり                               | non-ui と判定、DDS バリデータ不起動                          | Edge: explicit override       |
| EX-0002-0010 | BR-0002-0008 | UI-bearing pack に DDS セクションあり                                                       | QFAI-DDP-019 pass                                            | Happy: DDS 存在               |
| EX-0002-0011 | BR-0002-0008 | UI-bearing pack に DDS セクションなし                                                       | QFAI-DDP-019 error                                           | Negative: DDS 不在            |
| EX-0002-0012 | BR-0002-0009 | DDS に 2 オプション                                                                         | QFAI-DDP-020 pass                                            | Happy: 2 options              |
| EX-0002-0013 | BR-0002-0010 | DDS にアンカースクリーン選択あり                                                            | QFAI-DDP-021 pass                                            | Happy: anchor                 |
| EX-0002-0014 | BR-0002-0011 | competitive ref に 3 フィールド全て populated                                               | QFAI-DDP-022 pass                                            | Happy: 3 fields               |
| EX-0002-0015 | BR-0002-0011 | competitive ref の rejected_points が missing                                               | QFAI-DDP-022 error                                           | Negative: missing field       |
| EX-0002-0016 | BR-0002-0015 | 非 UI pack で qfai validate 実行                                                            | DDS バリデータ不起動、新規 issue ゼロ                        | Non-UI safety                 |
| EX-0002-0017 | BR-0002-0016 | UI-bearing project で discussion 完了                                                       | uiux/ に 3-layer canonical family 11 ファイル生成            | Happy: sidecar 生成 (3-layer) |
| EX-0002-0018 | BR-0002-0017 | 新規 pack で全軸が 3-layer 分類                                                             | validator pass、4-axis ファイル不在                          | Happy: 3-layer                |
| EX-0002-0019 | BR-0002-0018 | uiux/ に 20_eval_axis_usability.md が存在する pack                                          | error: "4-axis template files are forbidden"                 | v1.7.12: 即時 error           |
| EX-0002-0020 | BR-0002-0019 | 全軸に 16 フィールド存在                                                                    | scoring validator pass                                       | Happy: scoring-ready          |
| EX-0002-0021 | BR-0002-0020 | strategy に 8 フィールド + selection_required=true + 3 candidates                           | strategy validator pass                                      | Happy: strong strategy        |
| EX-0002-0022 | BR-0002-0022 | 3 screen entries, 全 10 フィールド, unique screen_ids                                       | screen contract validator pass                               | Happy: screen contract        |
| EX-0002-0023 | BR-0002-0024 | taste interview 10 セクション全て非空                                                       | taste validator pass                                         | Happy: taste interview        |
| EX-0002-0024 | BR-0002-0025 | trend scan with freshness_date, confidence, source_translation                              | trend validator pass                                         | Happy: trend scan             |
| EX-0002-0025 | BR-0002-0012 | primary CTA defined in DDS                                                                  | QFAI-DDP-023 pass                                            | Happy: CTA hierarchy          |
| EX-0002-0026 | BR-0002-0013 | 4 states (empty/loading/error/populated) defined                                            | QFAI-DDP-024 pass                                            | Happy: state coverage         |
| EX-0002-0027 | BR-0002-0014 | 1 design anti-goal defined                                                                  | QFAI-DDP-025 pass                                            | Happy: anti-goals             |
| EX-0002-0028 | BR-0002-0021 | strategy with selection_required=true, 1 candidate only                                     | validator error: candidate_options must have >= 2            | Edge: insufficient candidates |
| EX-0002-0029 | BR-0002-0023 | 2 screen entries with duplicate screen_id                                                   | validator error: duplicate screen_id                         | Edge: duplicate screen_id     |
| EX-0002-0030 | BR-0002-0026 | any DDS validator detects violation                                                         | severity is "error"                                          | All validators emit error     |
| EX-0002-0031 | BR-0002-0027 | uiux/ に 21_eval_axis_consistency.md が残存                                                 | error: forbidden 4-axis file detected                        | Negative: 旧ファイル残存      |
| EX-0002-0032 | BR-0002-0027 | uiux/ に 31_anchor.md が残存                                                                | error: 31_anchor.md is replaced by 31_selected_anchor_screen | Negative: 旧ファイル残存      |
| EX-0002-0033 | BR-0002-0027 | uiux/ に 60_critique_loop.md が残存                                                         | error: 60_critique_loop.md removed from family               | Negative: 旧ファイル残存      |
| EX-0002-0034 | BR-0002-0028 | 00_index.md に 3-layer canonical file list（11 ファイル）記載                               | validator pass                                               | Happy: canonical index        |
| EX-0002-0035 | BR-0002-0028 | 00_index.md に旧 20_eval_axis_usability.md への参照あり                                     | error: forbidden reference to 4-axis file                    | Negative: stale reference     |
| EX-0002-0036 | BR-0002-0029 | uiux/ に 30_option_comparison.md と 31_selected_anchor_screen.md が存在し、旧ファイルが不在 | validator pass                                               | Happy: renamed file           |
| EX-0002-0037 | BR-0002-0030 | uiux/ に 20~24 の 5 評価ファイルが全て 3-layer 準拠で存在                                   | validator pass                                               | Happy: 3-layer family 完備    |
| EX-0002-0038 | BR-0002-0030 | uiux/ に 24_design_eval_dynamic_overrides.md が不在                                         | validator pass (OPTIONAL file)                               | Happy: optional file absent   |
| EX-0002-0039 | BR-0002-0016 | 非 UI project で discussion 完了                                                            | uiux/ ディレクトリ不在、error なし                           | Non-UI: sidecar skip          |

## EX-0002-0040: prototyping.yaml Missing

- BR-Ref: BR-0002-0031

| Input                                                          | Expected                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| discussion-pack with 15 markdown files but no prototyping.yaml | missingSideArtifacts: ["prototyping.yaml"], QFAI-DPACK-002 emitted |

## EX-0002-0041: Canonical Issue Code

- BR-Ref: BR-0002-0032

| Input                                                                           | Expected                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| UI-bearing pack with missing selected anchor in 31_selected_anchor_screen.md | UIX-VAL-DDH-SELECTED-ANCHOR (not QFAI-DDP-021) |

## EX-0002-0042: DDH Validator Source Mapping

- BR-Ref: BR-0002-0033

| Code                           | Source File                                        | Check                                      |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------ |
| UIX-VAL-DDH-SELECTED-ANCHOR   | uiux/31_selected_anchor_screen.md                  | `## Selected Anchor` + `Selected:` 宣言 (v1.7.14 リネーム) |
| UIX-VAL-DDH-OPTION-COMPARISON  | uiux/30_option_comparison.md                       | 2+ option comparison                       |
| UIX-VAL-DDH-STATE-COVERAGE     | 03_Story-Workshop.md + uiux/40_screen_contracts.md | state-risk signal + contract handoff       |

## EX-0002-0043: Nested Bullet vs CSV Parsing

- BR-Ref: BR-0002-0034

| Input                                | Expected                        |
| ------------------------------------ | ------------------------------- |
| primary_tasks as indented child list | Parsed as array                 |
| primary_tasks as CSV "task1, task2"  | Parsed as array (legacy compat) |

## EX-0002-0044: State Coverage v1.7.13

- BR-Ref: BR-0002-0036

| Input                                              | Expected                |
| -------------------------------------------------- | ----------------------- |
| States: default, loading, empty, error             | Pass                    |
| States: empty, loading, error, populated (old set) | Fail: "default" missing |

## EX-0002-0045: Strategy Nested Bullet Parsing

- BR-Ref: BR-0002-0035

| Input                                             | Expected                                  |
| ------------------------------------------------- | ----------------------------------------- |
| candidate_options as nested bullet list (3 items) | Parsed as 3-element array                 |
| candidate_options as CSV "A, B, C"                | Parsed as 3-element array (legacy compat) |

## EX-0002-0046: Review Request Selected Anchor

- BR-Ref: BR-0002-0037

| Input                                                                      | Expected                 |
| -------------------------------------------------------------------------- | ------------------------ |
| 14_Review-Request.md with "Selected Anchor" in Design Direction Decisions  | Validator pass           |
| 14_Review-Request.md with "Direction" instead of "Selected Anchor"         | Warning: deprecated term |
