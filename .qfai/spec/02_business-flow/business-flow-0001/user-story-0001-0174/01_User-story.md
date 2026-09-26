# US-0001-0174: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` emission with mandatory `justification:`

## User Story

As a Reviewer-Gate consumer, I want the Reviewer Gate to emit `R-PROMPT-SCANNER-DRIFT` (severity: error) with a non-empty `justification:` (naming the modified file, the un-paired counterpart, and the unmatched contract clause) whenever the upstream SSOT-sync-pair CI lane flags drift between `findDesignMdViolations.ts` and `generator-prompt.md`, so that downstream `qfai validate` ingestion can reject empty-justification findings under the existing prior-pack justification contract (REQ-0015-0014, per the discussion-20260522081618995 REQ-0006 justification text contract).

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0008`
