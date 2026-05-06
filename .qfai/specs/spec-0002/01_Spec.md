# 01 Spec

- Spec: spec-0002
- Parent: CAP-0002
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0002/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- 本 spec は discussion pack と exploration-first UI sidecar family の active structure 定義である

## Scope

- In:
  - 15-file discussion-pack structure
  - UI-bearing detection and non-UI safe skip
  - exploration-first UI sidecar family
  - OQ-driven completion
  - planner-first authoring rules
  - review input bundle and review request semantics
  - `/qfai-sdd` への upstream handoff
- Out:
  - visual winner selection in discussion
  - discussion 時点での design system 固定
  - old 3-layer evaluation sidecar family
  - legacy single-winner / comparison canonical path

## Applicable NFR

- NFR-0001: OQ completeness
- NFR-0002: discussion pack completeness
- NFR-0003: UI-bearing sidecars are generated only when classification requires them
- NFR-0004: downstream truth remains contracts-first

## Applicable Policy

- Discussion is planner-first.
- Discussion does not choose a single visual winner.
- Discussion does not finalize the design system.
- Downstream skills consume normalized specs/contracts, not the discussion pack directly.

## Evidence Summary

- Evidence: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/**`
- Evidence: `packages/qfai/src/core/validators/uix/threeLayer.ts`

> v1.8.9: the `discussionDesignHardening` validator was retired together
> with the exploration-sidecar family; the corresponding evidence row was
> removed. The DESIGN.md-driven equivalent is owned by the post-1.8.9
> prototyping spec and is anchored by `parseDesignMd` /
> `validateDesignMd` plus the `validateDesignContractReadiness` family in
> `packages/qfai/src/core/validators/designContractReadiness.ts`.

## Relevant Requirements

- REQ-0001: discussion-pack は 15 必須 markdown ファイルを持つ
- REQ-0002: 命名規則は `discussion-YYYYMMDDhhmmssSSS`
- REQ-0003: Blocking OQ は 0 件でなければ完了できない
- REQ-0004: `03_Story-Workshop.md` は Mermaid diagram を含む
- REQ-0005: UI-bearing discussion packs require `prototyping.yaml`; non-ui discussion packs do not
- REQ-0006: UI-bearing pack は exploration-first sidecar family を生成する
- REQ-0007: canonical sidecar family は `30_exploration_brief`, `31_reference_pool`, `32_design_anti_goals`, `33_exploration_rubric`, `34_evaluator_calibration`, `40_screen_contracts`, `50_review_input_bundle`
- REQ-0008: `30_exploration_brief.md` は product intent / must-preserve interactions / brand signals / differentiation targets を含む
- REQ-0009: `33_exploration_rubric.md` は design quality / originality / craft / functionality を含む
- REQ-0010: `34_evaluator_calibration.md` は good critique / too lenient / blandness fail / originality fail を含む
- REQ-0011: `50_review_input_bundle.md` は best-of-history handling を含む
- REQ-0012: discussion は single winner / selected direction / design system finalization を行わない
- REQ-0013: discussion sidecar は upstream authoring artifact であり downstream execution truth ではない

## Entry points

- US range in this spec: US-0002-0001..US-0002-0010
- Primary actors: Pack author, Reviewer, Discussion facilitator, Skill maintainer
- Notes: current downstream truth は specs/contracts であり、discussion pack は `/qfai-sdd` の入力専用

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: UI-bearing classification is unclear
- Conflict: planner-first rule conflicts with an older artifact
- Missing: required sidecar headings are unclear
- Trade-off: strict readiness vs authoring flexibility

### Escalation Targets (Read-only, decision basis)

- `_policies/01_Objective.md`
- `_policies/05_Contracts.md`
- `_policies/07_Constraints.md`
- `_policies/08_Decisions.md`
