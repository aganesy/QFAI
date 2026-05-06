# 03 Acceptance-Criteria

## AC-0010-0001

Given a UI-bearing discussion pack, when sidecar generation completes, then `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md`, `33_exploration_rubric.md`, `34_evaluator_calibration.md`, `40_screen_contracts.md`, and `50_review_input_bundle.md` exist.

## AC-0010-0002

Given `30_exploration_brief.md`, when validated, then it contains Product Intent, Must-preserve Interactions, Brand Signals, and Differentiation Targets.

## AC-0010-0003

Given `33_exploration_rubric.md`, when validated, then it contains Design Quality, Originality, Craft, and Functionality.

## AC-0010-0004

Given `34_evaluator_calibration.md`, when validated, then it contains Good Critique, Too Lenient, Blandness Fail, and Originality Fail.

## AC-0010-0005

Given `50_review_input_bundle.md`, when validated, then it documents best-of-history handling.

## AC-0010-0006

Given a UI-bearing discussion pack, when inspected, then it does not declare a final winner direction or finalized design system.

## AC-0010-0007: DESIGN.md draft as discussion phase output

- Given a `/qfai-discussion` UI-bearing run completes,
- When the discussion pack is finalized,
- Then root `DESIGN.md` exists at the consuming-project root with required token tables (color / typography / radius / shadow) parseable per the design-md reference under the active design contracts of this spec's discussion deliverables.

## AC-0010-0008: legacy sidecars not emitted

- Given a fresh `/qfai-discussion` UI-bearing run,
- When the produced sidecars are listed,
- Then `33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md` are NOT created. Producing them is a regression and triggers the skill validator under this spec.
