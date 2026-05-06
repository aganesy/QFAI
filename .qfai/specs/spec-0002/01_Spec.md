# 01 Spec

- Spec: spec-0002
- Parent: CAP-0002
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0002/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- 本 spec は discussion pack の active structure 定義である (v1.8.9 で
  exploration-first UI sidecar family は post-1.8.9 prototyping spec
  へ移管されたため、本 spec は markdown-first / planner-first 構造と
  upstream authoring rules のみを規定する)

## Scope

- In:
  - 15-file discussion-pack structure
  - UI-bearing detection and non-UI safe skip
  - OQ-driven completion
  - planner-first authoring rules
  - review input bundle and review request semantics
  - `/qfai-sdd` への upstream handoff
- Out:
  - visual winner selection in discussion
  - discussion 時点での design system 固定
  - old 3-layer evaluation sidecar family
  - legacy single-winner / comparison canonical path
  - exploration-first UI sidecar family (v1.8.9: retired together with
    `discussionDesignHardening`; downstream behaviors are owned by the
    post-1.8.9 prototyping spec via root `DESIGN.md` + `validateDesignContractReadiness`)

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
- REQ-0012: discussion は single winner / selected direction / design system finalization を行わない
- REQ-0013: discussion sidecar は upstream authoring artifact であり downstream execution truth ではない

> v1.8.9: REQ-0006..0011 (the legacy exploration-first sidecar
> requirements that drove `discussionDesignHardening`) were retired
> together with the validator and their derived ledger rows (see
> retirement notes in 02_User-stories.md / 03_Acceptance-Criteria.md /
> 04_Business-Rules.md / 05_Examples.md / 06_Test-Cases.md /
> tdd/test-list.md). Their downstream behaviors are owned by the
> post-1.8.9 prototyping spec, which anchors brand SSOT in root
> `DESIGN.md` and the `validateDesignContractReadiness` family.

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
