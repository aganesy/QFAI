# US-0001-0179: `qfai audit log` CLI surface

## User Story

As a QFAI operator, I want a `qfai audit log` CLI (SHOULD) that lists the envelope-deviation decision records newest-first with `--scope` / `--operator` / `--clause` filters and `--format table|json` (table default), so that ops audit of recorded deviations does not require piping raw JSON through external tooling (REQ-0171, CLI-AUDIT, DR-0271).

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0013`
