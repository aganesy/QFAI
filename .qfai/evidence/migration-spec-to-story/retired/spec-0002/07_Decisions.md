# 07 Decisions

## Decisions

### DR-0002-0001: discussion is planner-first

- Date: 2026-04-23
- Context: discussion で visual winner や design system を確定すると、prototyping が局所改善に閉じやすい
- Adopted: discussion は exploration conditions, anti-goals, rubric, calibration, screen contracts を定義する planner phase とする
- Why: design breakthrough は prototyping の探索と比較で生まれるため

### DR-0002-0002: exploration-first sidecar family を canonical とする

- Date: 2026-04-23
- Context: 旧 sidecar family は comparison / single-winner selection / legacy evaluation sidecar に強く依存していた
- Adopted: `30_exploration_brief`, `31_reference_pool`, `32_design_anti_goals`, `33_exploration_rubric`, `34_evaluator_calibration`, `40_screen_contracts`, `50_review_input_bundle` を canonical とする
- Why: planner inputs と prototyping evaluation inputs を直接つなげられるため

### DR-0002-0003: discussion は winner と design system を確定しない

- Date: 2026-04-23
- Context: 旧 single-winner fixation と discussion 時点の design system 固定は exploration-first 実装と矛盾する
- Adopted: `selected-direction.yaml` と `design-system.yaml` は prototyping winner selection 後の downstream output とする
- Why: 早期収束を避け、探索の自由度を確保するため
