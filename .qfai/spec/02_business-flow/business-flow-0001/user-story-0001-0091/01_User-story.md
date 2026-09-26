# US-0001-0091: Legacy Sidecar Drop

## User Story

As a QFAI maintainer, I want `/qfai-discussion` to no longer emit legacy sidecars (`33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md`) so v2.0 / UX-loop runs cannot inherit deprecated framing.

## Legacy Source Scope

- In:
  - `/qfai-discussion` exploration authoring workflow for UI-bearing packs
  - `04_Sources.md` reference research posture
  - `40_screen_contracts.md`
  - `50_review_input_bundle.md`
  - root `DESIGN.md` draft authoring as Phase output (brand vision / visual identity SSOT for downstream)
  - drop legacy sidecars (`uiux/33_exploration_rubric.md`, `uiux/34_evaluator_calibration.md`, `uiux/30_exploration_brief.md`, `uiux/31_reference_pool.md`, `uiux/32_design_anti_goals.md`) — DESIGN.md replaces them
- Out:
  - legacy trend-derived scoring sidecar など旧 evaluation sidecar family
  - discussion 時点の brand archetype selection
  - discussion 時点の design system generation

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0010/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0010/02_User-stories.md#us-0010-0010`
