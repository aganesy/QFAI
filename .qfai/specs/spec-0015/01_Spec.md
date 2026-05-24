# 01 Spec

- Spec: spec-0015
- Parent: CAP-0015
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0015/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- SSOT for concrete agent definitions lives in `.qfai/assistant/agents/*.md`

## Scope

- In:
  - agent catalog and routing framework
  - orchestrator protocol
  - delegation hard-stop rules
  - review profiles and gate rules
  - skill integration
  - prototyping evaluator/reviewer routing
  - `/qfai-prototyping` v2.0 routing rebuild: orchestrator → product-experience-architect (generator) + product-surface-reviewer (evaluator) + devops-ci-engineer (capture); same-Claude generator/reviewer is forbidden (self-preference bias)
  - `review-profiles.yml` drops the `full-harness` profile; only the `default` profile remains active
- Out:
  - runtime execution engines
  - removed prototyping CLI behavior

## Applicable NFR

- NFR-0001: routing policy remains centralized
- NFR-0002: specialist responsibilities stay explicit
- NFR-0003: first delegation failure hard-stops the stage

## Applicable Policy

- Orchestrator delegates; it does not simulate missing roles.
- Blocking reviewer findings gate completion.

## Evidence Summary

- Evidence: agent catalog, routing files, review gate rules, shared delegation baseline

## Relevant Requirements

- REQ-0001: agent catalog remains the role registry
- REQ-0002: standard contract structure stays consistent
- REQ-0003: orchestrator remains delegation-only
- REQ-0004: work order schema remains explicit
- REQ-0005: review modes remain centrally registered
- REQ-0006: routing policy remains centralized
- REQ-0012: all-reviewer FAIL obligations stay in force
- REQ-0013: prototyping review profile is defined in terms of current skill-led evaluation/reviewer routing, not a removed runtime entrypoint
- REQ-0014: prototyping evidence-phase routing may require `product-experience-architect` and related reviewers based on specs + contracts inputs
- REQ-0015: delegation failure hard-stop output remains mandatory
- REQ-0015-0013: Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` regression check — Reviewer Gate MUST emit finding `R-CERTIFY-VERIFY-CIRCULAR` (severity: error) when a future PR reintroduces the cycle where certify reads validator output requiring `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase. The check is structural and asserts the option-B path (per upstream deferred-OQ decision): certify reads no validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts.
- REQ-0015-0014: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` finding emission — Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` (severity: error) with mandatory `justification:` text per the prior-pack contract from `.qfai/discussion/discussion-20260522081618995/` REQ-0006 (justification must name the modified file, the un-paired counterpart, and the unmatched contract clause; reuses the justification-text contract from NFR-0115 of the current pack).

## Entry points

- US range in this spec: US-0015-0001..US-0015-0008
- Primary actors: QFAI maintainer, orchestrator, reviewer agents
