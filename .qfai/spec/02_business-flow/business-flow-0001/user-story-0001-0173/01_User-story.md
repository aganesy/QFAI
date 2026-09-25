# US-0001-0173: Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` regression check

## User Story

As a QFAI maintainer, I want the Reviewer Gate to emit `R-CERTIFY-VERIFY-CIRCULAR` (severity: info — `qfai prototyping certify` is what refuses the wrong-phase verdict, with exit 2) whenever a future PR reintroduces the cycle where certify reads validator output that requires `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase, so that the prototyping-completable certify path (option-B per upstream deferred-OQ decision) cannot silently regress to the old circular contract (REQ-0015-0013).

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0007`
