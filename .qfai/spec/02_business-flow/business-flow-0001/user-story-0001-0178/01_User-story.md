# US-0001-0178: New Reviewer-Gate finding-code catalog

## User Story

As a Reviewer-Gate consumer, I want the eight new second-wave finding codes registered as a catalog (membership only — the catalog declares no per-code severity column, each code keeping the severity its own detector emits — with every code carrying a mandatory non-empty `justification:` whose empty / whitespace-only value is rejected at severity error), so that Capabilities across the pack are tied to Reviewer-Gate enforcement under the single justification-text contract (REQ-0168, TC-71 advisory-failing posture).

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0012`
