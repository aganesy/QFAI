# US-0001-0176: Envelope-deviation `AskUserQuestion` audit-log

## User Story

As a QFAI maintainer, I want the skill body to write an envelope-deviation decision record to `.qfai/evidence/decision/<ISO8601-ts>.json` whenever an `AskUserQuestion` names one of the four envelope-deviation contexts (skill-envelope / architectural-decision / rejected-option re-adoption / scope-expansion), so that future reviewers can map a deviation back to the architectural envelope-contract clause it touched (REQ-0158, DR-0270).

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0010`
