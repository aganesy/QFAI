# 01 Spec

- Spec: spec-0010
- Parent: CAP-0010

## Consumer View

- Primary SSOT for execution: `spec-0010/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-discussion` unified workflow
  - 3-layer evaluation family (`20/21/22/23`)
  - UI-bearing sidecar generation
  - design system generation
  - trend-to-axis derivation
  - `/qfai-sdd` へ渡す upstream design/UI authoring artifacts
- Out:
  - public prototyping mode negotiation as an active user contract
  - runtime/full-harness execution model

## Applicable NFR

- NFR-0001: OQ completeness
- NFR-0002: discussion pack completeness
- NFR-0003: UI-bearing sidecars are generated only when classification requires them

## Applicable Policy

- Discussion defines evaluation axes and design intent.
- Prototyping execution is downstream and skill-led.
- downstream skill は discussion pack を直接読まず、`/qfai-sdd` が正規化した spec/contracts を読む。

## Evidence Summary

- Evidence: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/**`

## Relevant Requirements

- REQ-0001: discussion creates the canonical 3-layer evaluation family
- REQ-0002: discussion creates UI-bearing sidecars when required
- REQ-0003: discussion may emit prototyping hints as `/qfai-sdd` input references
- REQ-0004: downstream prototyping hints do not define a public mode engine
- REQ-0005: discussion-side `uiux/*.md` are upstream-only and must be normalized by `/qfai-sdd` before downstream execution
- REQ-0019: score scope annotations describe how discussion scoring differs from downstream prototyping evaluation
- REQ-0027: design guideline research remains mandatory for UI-bearing packs
- REQ-0028: guideline research is recorded in `04_Sources.md`
- REQ-0029: quantitative score anchors guidance remains part of trend-derived axes

## Entry points

- US range in this spec: US-0010-0001..US-0010-0022
- Primary actors: QFAI user, discussion agents
- Notes: discussion outputs feed `/qfai-sdd`; downstream skills consume the normalized specs/contracts, not the discussion pack directly
