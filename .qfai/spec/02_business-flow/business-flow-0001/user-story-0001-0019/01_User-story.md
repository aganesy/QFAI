# US-0001-0019: direct-pack validator alignment

## User Story

As a maintainer, I want direct discussion-pack validators to check the new sidecar family and headings, so that validator behavior matches the shipped discussion template.

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0002/02_User-stories.md#us-0002-0010`
