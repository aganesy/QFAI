# US-0001-0175: SKILL.md `## Default Autopilot Policy` section

## User Story

As a QFAI operator, I want every SKILL.md to carry a `## Default Autopilot Policy` section with three named buckets (auto-decide / ask-user / hard-required) and a Reviewer Gate that emits `R-AUTOPILOT-POLICY-MISSING` (severity error) when the section is absent OR is present but missing one or more required buckets (heading-only / partial population), so that avoidable per-session `AskUserQuestion` prompts collapse to 0–1 while approval-required governance operations / destructive / version-pin / scope-expansion decisions still require human authorization — the first being a category each skill instantiates with the operations its own run cannot authorize for itself, so a skill may narrow a bucket to what it can reach but may not add an entry outside the prototype's categories (REQ-0160, DR-0269 Amendment 2) — the categories being those four plus, for a skill whose own operation is the interview, a decision a declared grilling session puts to the user (DR-0269 Amendment 4).

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0015/02_User-stories.md#us-0015-0009`
