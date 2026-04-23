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
Scenario: Blocking OQ が残っている場合にエラー
  Given 11_OQ-Register.md に Disposition: open の OQ がある
  When discussion completion を検証する
  Then error が出力される
```

```gherkin
# AC-0002-0003
Scenario: UI-bearing パックで exploration-first sidecar family が必須
  Given UI-bearing discussion pack
  When discussion hardening validator が実行される
  Then 30_exploration_brief.md, 31_reference_pool.md, 32_design_anti_goals.md, 33_exploration_rubric.md, 34_evaluator_calibration.md, 40_screen_contracts.md, 50_review_input_bundle.md が存在する
```

```gherkin
# AC-0002-0004
Scenario: exploration brief に必須見出しがある
  Given UI-bearing discussion pack
  When 30_exploration_brief.md を検査する
  Then Product Intent, Must-preserve Interactions, Brand Signals, Differentiation Targets が存在する
```

```gherkin
# AC-0002-0005
Scenario: exploration rubric に必須評価軸がある
  Given UI-bearing discussion pack
  When 33_exploration_rubric.md を検査する
  Then Design Quality, Originality, Craft, Functionality が存在する
```

```gherkin
# AC-0002-0006
Scenario: evaluator calibration に critique 較正見出しがある
  Given UI-bearing discussion pack
  When 34_evaluator_calibration.md を検査する
  Then Good Critique, Too Lenient, Blandness Fail, Originality Fail が存在する
```

```gherkin
# AC-0002-0007
Scenario: review input bundle が best-of-history を記録する
  Given UI-bearing discussion pack
  When 50_review_input_bundle.md を検査する
  Then best-of-history handling が記載されている
```

```gherkin
# AC-0002-0008
Scenario: discussion は visual winner を選ばない
  Given UI-bearing discussion pack
  When discussion artifacts を検査する
  Then selected direction や finalized design system を discussion の完了条件として要求しない
```

```gherkin
# AC-0002-0009
Scenario: 非 UI パックは sidecar requirement をバイパスする
  Given non-UI discussion pack
  When discussion completion を検証する
  Then UI sidecar 欠落だけではエラーにならない
```

```gherkin
# AC-0002-0010
Scenario: UI-bearing discussion packs require prototyping.yaml
  Given latest discussion pack is UI-bearing
  When discussion README / skill contract を検証する
  Then `prototyping.yaml` requiredness が明記されている
```

## AC Catalog (optional)

| AC_ID        | Title                              | Notes         | Priority |
| ------------ | ---------------------------------- | ------------- | -------- |
| AC-0002-0001 | 15 必須ファイル                    | REQ-0001      | P1       |
| AC-0002-0002 | Blocking OQ ゼロ                   | REQ-0003      | P1       |
| AC-0002-0003 | sidecar family complete            | REQ-0006,0007 | P1       |
| AC-0002-0004 | exploration brief headings         | REQ-0008      | P1       |
| AC-0002-0005 | exploration rubric headings        | REQ-0009      | P1       |
| AC-0002-0006 | evaluator calibration headings     | REQ-0010      | P1       |
| AC-0002-0007 | best-of-history documented         | REQ-0011      | P1       |
| AC-0002-0008 | planner-first / no winner          | REQ-0012      | P1       |
| AC-0002-0009 | non-UI safe skip                   | REQ-0006      | P1       |
| AC-0002-0010 | prototyping.yaml requiredness text | REQ-0005      | P1       |
