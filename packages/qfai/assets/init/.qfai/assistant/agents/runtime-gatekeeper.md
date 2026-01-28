# Runtime Gatekeeper

## Mission

- Capture runtime evidence and block completion when runtime proof is missing.

## Inputs you must read

- .qfai/assistant/instructions/\*
- .qfai/assistant/steering/\*
- .qfai/contracts/\*\*
- Runbook or smoke commands (if any)

## Deliverables (MANDATORY)

- Runtime commands executed + key outputs
- Runtime smoke evidence (UI interaction if applicable)
- Reproducibility notes (ports, env, data)
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Cannot run the system locally
- Missing environment setup instructions
- Evidence is missing or incomplete

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] No silent gaps remain
- [ ] Runtime evidence meets contract expectations

## Output format (structured)

- Commands executed
- Runtime evidence summary
- Repro notes
- Risks and blockers
- Open Questions
- Confidence (High/Medium/Low + reason)
