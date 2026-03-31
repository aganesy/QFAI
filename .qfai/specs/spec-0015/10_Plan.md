# 10 Plan

## Implementation Strategy

1. Agent catalog: document 39 agents with standard contract structure in `.qfai/assistant/agents/*.md`
2. Orchestrator Protocol: define delegation rules, Capability Probe, Simulation Mode
3. Work Orders schema: define table format used across all skills
4. Devils-advocate: register in roster, define behavioral principles, implement 3-FAIL demotion
5. Pattern-doubler: register in roster, define rationale obligation, N/A logic
6. Skill integration: update all SKILL.md files to reference agent delegation
7. RCP footer: update skill-specific footers for new reviewers
8. Gate rules: update `review-gate.rules.yml` for new reviewer gates

## Test Strategy

- Unit tests: agent contract structure validation, roster completeness, gate rule parsing
- Integration tests: skill-agent integration, RCP footer consistency
- Asset tests: required/forbidden phrase guardrails across docs, wrappers, and skill files

## Dependencies

- Requires: QFAI skill framework (SKILL.md structure)
- Consumed by: all QFAI skills reference this framework

## Risk

- Adding 2 reviewers increases review cycle time
- Mitigation: NFR-0001 caps at 2x existing time; advisory demotion prevents infinite loops
