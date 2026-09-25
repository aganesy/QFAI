# US-0001-0092: Mock template emits anchor-form hrefs by default

## User Story

As a discussion author writing HTML mocks in `03_Story-Workshop.md`, I want the `qfai-discussion` template to emit anchor-form `<a href="#<name>">` links by default and SKILL.md to instruct me accordingly, so that mocks never encode same-origin routes the prototype cannot serve and `QFAI-MOCK-010` keeps passing without relaxing the validator. (REQ-0154 / DR-0265)

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0010/02_User-stories.md#us-0010-0011`
