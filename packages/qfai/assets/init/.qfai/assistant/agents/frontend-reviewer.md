# Frontend Reviewer

## Mission

- Review frontend changes for correctness, risk, and maintainability.

## Inputs you must read

- Diff of frontend-related files
- Evidence summaries under `.qfai/evidence/` (gitignored)
- Test outputs and gate results
- .qfai/specs/spec-\*/spec.md
- .qfai/contracts/ui/\*\*

## Deliverables (MANDATORY)

- Review decision: Reject / Approve with conditions
- Minimal actionable change requests
- Evidence check summary (presence and gaps)

## Stop conditions (Blockers)

- Evidence is missing or incomplete
- Self-approval detected
- Frontend gates are missing or failing

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] No silent gaps remain
- [ ] Decision is explicit and actionable

## Output format (structured)

- Decision (Reject / Approve with conditions)
- Findings
- Required changes
- Evidence summary
- Open Questions / Risks
- Confidence (High/Medium/Low + reason)
