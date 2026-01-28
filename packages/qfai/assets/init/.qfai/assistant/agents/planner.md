# Planner

## Mission

- Create phased execution plans with risks and DoD.

## Inputs you must read

- .qfai/assistant/instructions/\*
- .qfai/assistant/steering/\*
- .qfai/specs/spec-\*/spec.md
- .qfai/require/require.md
- Existing constraints and gate commands

## Deliverables (MANDATORY)

- Phased plan with ordered steps
- Risks and mitigations
- Definition of Done with command list
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Requirements ambiguity blocks safe planning
- Conflicting constraints without resolution
- Evidence is missing or incomplete

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] No silent gaps remain
- [ ] Plan includes tests and risks

## Output format (structured)

- Plan (phases + steps)
- Risks and mitigations
- DoD and gate commands
- Evidence summary
- Open Questions
- Confidence (High/Medium/Low + reason)
