# 09 Delta

## Change Summary

- Change ID: DELTA-S31-001
- Date: 2026-03-29
- Primary: spec-0031 initial creation
- Tags: v1.7.6, full-harness, premium-mode, iteration-loop
- Summary: Initial spec creation for Full-Harness Premium Mode (CAP-0031)

## Rationale

- Core premium prototyping capability for v1.7.6
- Planner/generator/evaluator decomposition enables structured iterative refinement

## Candidates Considered

1. Premium mode as a flag on existing prototyping skill
2. Premium mode as a separate skill (adopted)
3. Premium mode as default behavior

## Adopted

- Adopted: Separate skill `/qfai-prototyping-full-harness`
- Why: Keeps standard path lightweight; explicit opt-in for cost/complexity (SD-0031-001, DR-0077)
- Evidence: discussion-20260329175059391

## Rejected

- Candidate: Premium mode as flag on existing skill
- Reason: Pollutes standard path code with premium logic
- DO NOT: Add --premium or --full-harness flag to existing /qfai-prototyping
- Temptation: Simpler discovery for users (one skill, one flag)

- Candidate: Premium mode as default
- Reason: Cost and complexity imposed on all users (DR-0077)
- DO NOT: Make full-harness the default prototyping mode
- Temptation: Higher quality for everyone by default

- Candidate: Add critique to validate command
- Reason: Breaks validate's deterministic guarantee (DR-0078)
- DO NOT: Add LLM-based critique checks to qfai validate
- Temptation: Single command for all verification

## Impact

- Affects: packages/qfai/src/core/harness/ (new module), skill registration
- Validation: qfai validate pass, E2E tests for full loop, standard path regression test

## Follow-ups

- None (all OQs resolved via dependent specs)
