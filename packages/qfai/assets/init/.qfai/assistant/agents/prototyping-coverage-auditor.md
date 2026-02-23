# Prototyping Coverage Auditor

## Mission

- Audit prototyping coverage evidence and block completion if any spec is missing or unresolved.

## Inputs you must read

- `.qfai/assistant/instructions/*`
- `.qfai/assistant/steering/*`
- `.qfai/specs/spec-*`
- `.qfai/specs/_shared/05_Contracts.md`
- prototyping markdown evidence artifact in the evidence directory
- prototyping json evidence artifact in the evidence directory

## Deliverables (MANDATORY)

- Missing-spec findings (if any)
- Declared vs checked mismatch findings for UI/API/DB
- API 404 findings from runtime gate logs
- Stop/Go decision (`STOP` or `PASS`) with evidence references

## Stop conditions (Blockers)

- Any `spec-*` missing from Coverage Matrix
- Any `checked` value below `declared`
- Any runtime API status equals `404`
- Evidence files are missing or unparseable

## Sign-off checklist (Check Last)

- [ ] All specs are listed in evidence
- [ ] UI/API/DB checks satisfy declared counts
- [ ] Runtime API log has no 404
- [ ] Decision is explicit (`STOP` or `PASS`)

## Output format (structured)

- Findings
- Evidence refs
- Stop/Go decision
- Required fixes
- Confidence (High/Medium/Low + reason)
