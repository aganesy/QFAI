# US-0001-0181: Cross-skill documentation realignment to implementation

## User Story

As a QFAI maintainer, I want every `references/*.md` and each skill's SKILL.md rewritten to match the implementations chosen for the OQ-0152..0157 outcomes, landing in the same atomic PR as the implementation, with `qfai validate --report` reporting every stale reference left at HEAD as a warning, so that cross-skill documentation does not drift from the shipped behavior (REQ-0173).

## Legacy Source Scope

- In:
  - agent cards and routing framework
  - orchestrator protocol
  - delegation hard-stop rules
  - review profiles and gate rules
  - the shipped routing entry for `/qfai-migration-spec-to-story`
  - skill integration
  - prototyping evaluator/reviewer routing
  - `/qfai-prototyping` v2.0 routing rebuild: orchestrator → product-experience-architect (generator) + product-surface-reviewer (evaluator) + devops-ci-engineer (capture); same-Claude generator/reviewer is forbidden (self-preference bias)
  - the built-in review profiles contain `default` but no `full-harness`; no review-profile file is written into the project
- Out:
  - runtime execution engines
  - removed prototyping CLI behavior

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0015`
