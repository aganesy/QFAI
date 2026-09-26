# US-0001-0171: Pattern-Doubler Reviewer

## User Story

- Parent: CAP-0015

Requirement provenance: [approved concrete-review change](../../../../evidence/migration-spec-to-story/retired/decisions/CR-20260913-0007-concrete-pattern-review.md#requirement-source).

As a QFAI user, I want optional advisory review that proposes missing concrete business-flow, US, AC, EX or TC coverage with rationale, so that real behavior is covered without numeric targets or demands for more abstract rules.

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0005`
