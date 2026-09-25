# US-0001-0182: Reviewer-Gate ingests workflow-hygiene and shipped-shape drift

## User Story

- Parent: CAP-0015
- Source: discussion-20260804173914356#REQ-0013, #REQ-0022 (CHG-007)
- Goal: As a reviewer, I want the Reviewer Gate to ingest the two drift findings the workflow-hygiene lane emits, so that a hygiene or shipped-shape regression is surfaced in review rather than only in a CI log.
- Non-goals: authoring the lane itself (spec-0017), the shipped-file rules it checks (spec-0003), and any change to `qfai validate`'s own check set.
- Notes: follows the established emitter/ingestion split — an upstream CI lane emits, this spec defines how the gate consumes it. `R-PROMPT-SCANNER-DRIFT` is the precedent.

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0016`
