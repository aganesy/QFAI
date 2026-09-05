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
  - root `DESIGN.md` draft authoring as Phase output (brand vision / visual identity SSOT for downstream)
  - drop legacy sidecars (`uiux/33_exploration_rubric.md`, `uiux/34_evaluator_calibration.md`, `uiux/30_exploration_brief.md`, `uiux/31_reference_pool.md`, `uiux/32_design_anti_goals.md`) — DESIGN.md replaces them
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

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`
- Evidence: pack templates at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/`

## Relevant Requirements

- REQ-0001: UI-bearing discussion packs create `30_exploration_brief.md`
- REQ-0002: UI-bearing discussion packs create `31_reference_pool.md`
- REQ-0003: UI-bearing discussion packs create `32_design_anti_goals.md`
- REQ-0004: UI-bearing discussion packs create `33_exploration_rubric.md`
- REQ-0005: UI-bearing discussion packs create `34_evaluator_calibration.md`
- REQ-0006: `04_Sources.md` stores traceable reference research used by the reference pool
- REQ-0007: `50_review_input_bundle.md` records best-of-history assumptions for downstream critique
- REQ-0008: discussion does not create a final design system or selected direction
- REQ-0154: `QFAI-MOCK-010` direction — the `qfai-discussion` mock template emits anchor-form `<a href="#<name>">` by default and SKILL.md instructs authors accordingly; the validator stays strict (anchors `#name` + external `http(s)://` continue to PASS). Template ↔ validator are a new SSOT-sync pair (`R-MOCK-HREF-DRIFT`).
- REQ-0155: active discussion session pointer (writer side) — `/qfai-discussion` WRITES `.qfai/state.json#discussion.currentId` as the single SSOT for the active session; `qfai discussion list --active` is a read view over it. Multiple-active ambiguity is rejected with an error naming the candidate dirs and the recovery command (`qfai discussion use <id>`).

## Consumer View — Second-Wave (v1.9.2) behavior copy-down

- Mock HTML in `03_Story-Workshop.md` uses anchor-form hrefs (`<a href="#name">`); same-origin absolute paths (`/path/`) are NOT emitted by the template. External `http(s)://` and `#anchor` hrefs PASS `QFAI-MOCK-010`.
- On finalization `/qfai-discussion` sets `.qfai/state.json#discussion.currentId` to the just-authored pack ID; downstream skills resolve the active pack through that pointer (spec-0013 reader side).

## Entry points

- US range in this spec: US-0010-0001..US-0010-0012
- Primary actors: QFAI user, discussion agents, reviewer
