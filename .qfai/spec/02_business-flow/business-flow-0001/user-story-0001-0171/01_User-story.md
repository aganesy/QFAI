# US-0001-0171: Pattern-Doubler Reviewer

## User Story

- Parent: CAP-0015

Requirement provenance: the requirement source of the approved concrete-review change CR-20260913-0007, which git history keeps.

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

- Spec scope: the Scope section of retired spec-0015
- Story block: `us-0015-0005` of retired spec-0015
