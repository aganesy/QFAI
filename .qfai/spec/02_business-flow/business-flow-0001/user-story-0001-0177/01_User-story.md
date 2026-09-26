# US-0001-0177: Cross-skill `handoff.yaml` schema

## User Story

As a QFAI maintainer, I want a single canonical cross-skill handoff schema (`packages/qfai/src/core/schemas/handoff.ts`, documented in `references/handoff.md`) that every skill producing or consuming handoff state reads and writes, with a Reviewer Gate emitting `R-HANDOFF-SCHEMA-DRIFT` (severity error) on non-conforming writes or asymmetric SSOT-sync-pair edits, so that handoff state stops fragmenting into ad-hoc per-skill files (REQ-0161, CLI-HANDOFF, SSOT-sync Pair IV).

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0011`
