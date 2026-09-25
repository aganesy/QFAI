# US-0001-0015: UI-bearing detection

## User Story

As a maintainer, I want UI-bearing detection to control whether exploration-first sidecars are required, so that non-UI packs do not over-fire UI validators.

## Legacy Source Scope

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

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0002/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0002/02_User-stories.md#us-0002-0003`
- AC-0001-0015-01 restated by the brand-direction change request that
  `decisions.md#DEC-0683` records; main's text at
  `origin/main:.qfai/specs/spec-0002/03_Acceptance-Criteria.md`.
