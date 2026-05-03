# 01 Spec

- Spec: spec-0010
- Parent: CAP-0010
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0010/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-discussion` exploration authoring workflow for UI-bearing packs
  - `04_Sources.md` reference research posture
  - `30_exploration_brief.md`
  - `31_reference_pool.md`
  - `32_design_anti_goals.md`
  - `33_exploration_rubric.md`
  - `34_evaluator_calibration.md`
  - `40_screen_contracts.md`
  - `50_review_input_bundle.md`
- Out:
  - legacy trend-derived scoring sidecar など旧 evaluation sidecar family
  - discussion 時点の brand archetype selection
  - discussion 時点の design system generation

## Applicable NFR

- NFR-0001: UI-bearing sidecars are generated only when classification requires them
- NFR-0002: planner artifacts are concrete enough for downstream normalization
- NFR-0003: discussion artifacts do not pre-empt prototyping winner selection

## Applicable Policy

- Discussion creates exploration inputs, not the final direction.
- Reference research remains mandatory for UI-bearing packs.
- Downstream skills consume normalized specs/contracts, not raw discussion sidecars.

## Relevant Requirements

- REQ-0001: UI-bearing discussion packs create `30_exploration_brief.md`
- REQ-0002: UI-bearing discussion packs create `31_reference_pool.md`
- REQ-0003: UI-bearing discussion packs create `32_design_anti_goals.md`
- REQ-0004: UI-bearing discussion packs create `33_exploration_rubric.md`
- REQ-0005: UI-bearing discussion packs create `34_evaluator_calibration.md`
- REQ-0006: `04_Sources.md` stores traceable reference research used by the reference pool
- REQ-0007: `50_review_input_bundle.md` records best-of-history assumptions for downstream critique
- REQ-0008: discussion does not create a final design system or selected direction

## Entry points

- US range in this spec: US-0010-0001..US-0010-0008
- Primary actors: QFAI user, discussion agents, reviewer
