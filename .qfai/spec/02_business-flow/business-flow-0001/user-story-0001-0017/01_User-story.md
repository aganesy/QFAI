# US-0001-0017: discussion-to-SDD handoff

## User Story

As a QFAI user, I want discussion outputs to hand off cleanly into `/qfai-sdd`, so that contracts can be normalized without guessing.

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0002/02_User-stories.md#us-0002-0008`
