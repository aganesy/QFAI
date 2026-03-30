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

---

### DELTA-S31-002 (2026-03-30)

- **Change ID**: DELTA-S31-002
- **Date**: 2026-03-30
- **Primary**: v1.7.7 Remediation pass — dedicated entrypoint, evidence/reviewer policy, three-mode positioning
- **Tags**: v1.7.7, remediation, dedicated-entrypoint, skill-registration, evidence-policy, three-mode, P0-02
- **Source**: discussion-20260329195516830

#### Summary

Remediation of P0-02 (no dedicated /qfai-prototyping-full-harness entrypoint) and P1-07 (mode split not cleanly exposed).
Added US-0031-0007 through US-0031-0010, AC-0031-0013 through AC-0031-0016, BR-0031-0021 through BR-0031-0025, EX-0031-0031 through EX-0031-0040, TC-0031-0031 through TC-0031-0040.
Added DR-0083, DR-0084, DR-0085 to 07_Decisions.md. Updated 01_Spec.md scope and requirements. Updated 10_Plan.md with remediation implementation phases.

#### Adopted

- Dedicated skill registration requirement for /qfai-prototyping-full-harness (BR-0031-0021)
- SKILL.md as canonical surface for evidence policy and reviewer expectations (DR-0083)
- Three-mode cross-reference in SKILL.md to align with spec-0006 mode structure (DR-0084)
- Stateless routing reception (DR-0085)
- **Rationale**: Addresses P0-02 and P1-07 audit findings from discussion-20260329195516830; satisfies REQ-0002, REQ-0003, REQ-0010

#### Rejected

- Embedding evidence policy only in runtime code docs (not discoverable at invocation time)
- Omitting three-mode positioning from SKILL.md (leaves mode selection context gap)
- Making full-harness invocable via config or env var (violates explicit opt-in REQ-0011 / POL-001)

#### Impact

- Affects: `.qfai/assistant/skills/qfai-prototyping-full-harness/SKILL.md` (create or update with mandatory sections), skill registry entry
- Validation: TC-0031-0031..TC-0031-0040 must pass; existing TC-0031-0001..TC-0031-0030 must not regress
