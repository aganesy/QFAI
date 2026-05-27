# 10 Plan

## Implementation Strategy

1. Agent catalog: document 19 consolidated agents with standard contract structure in `.qfai/assistant/agents/*.md`
2. Orchestrator Protocol: define delegation rules, phase gates, and review handoff rules
3. Work Orders schema: define table format used across all skills
4. Review profiles: move devils-advocate and pattern-doubler into optional advisory modes
5. Agent routing: define mandatory, conditional, blocking, and parallel agents per skill phase
6. Skill integration: update all SKILL.md files to reference routing-driven delegation
7. RCP footer: update skill-specific footers for targeted rerun policy
8. Gate rules: update `review-gate.rules.yml` for routing-based reviewer gates

## Test Strategy

- Unit tests: agent contract structure validation, routing/profile integrity, gate rule parsing
- Integration tests: skill-agent integration, RCP footer consistency, Codex TOML parity
- Asset tests: required/forbidden phrase guardrails across docs, wrappers, and skill files

## Dependencies

- Requires: QFAI skill framework (SKILL.md structure)
- Consumed by: all QFAI skills reference this framework

## Risk

- Routing drift between SKILL.md and steering SSOT can break delegation
- Mitigation: central routing files become the only dispatch SSOT; tests validate Codex/init parity

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0015-0013..0014 per AC-0015-0013..0014:
  1. Reviewer-Gate adds `R-CERTIFY-VERIFY-CIRCULAR` (severity error) structural check: if a future PR wires `certify` to read a validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts, the gate fires with a 3-part justification (offending certify code path, offending validator-output file/profile, option-B contract clause violated).
  2. Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` with the 3-part justification SSOT shared with spec-0004's validate ingestion (one contract, two enforcers).
- Pair with spec-0004 wave: the validate-ingestion gate in spec-0004 is the rejector; this spec defines the emitter shape.
