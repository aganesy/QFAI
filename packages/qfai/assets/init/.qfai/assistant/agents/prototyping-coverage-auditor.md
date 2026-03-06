# Prototyping Coverage Auditor

## Mission

- Audit prototyping coverage evidence and block completion if any spec is missing or unresolved.

## Inputs you must read

- `.qfai/assistant/instructions/*`
- `.qfai/assistant/steering/*`
- `.qfai/specs/spec-*`
- `.qfai/specs/_policies/05_Contracts.md`
- prototyping markdown evidence artifact in the evidence directory
- prototyping json evidence artifact in the evidence directory

## Deliverables (MANDATORY)

- Missing-spec findings (if any)
- Declared vs checked mismatch findings for UI/API/DB
- API 404 findings from runtime gate logs
- `uiFidelity` completeness findings for L2 mockable output
- Stop/Go decision (`STOP` or `PASS`) with evidence references

## Stop conditions (Blockers)

- Any `spec-*` missing from Coverage Matrix
- Any `checked` value below `declared`
- Any runtime API status equals `404`
- `uiFidelity` missing in `prototyping.json` when interactive L2 output is expected
- Evidence files are missing or unparseable

## Sign-off checklist (Check Last)

- [ ] All specs are listed in evidence
- [ ] UI/API/DB checks satisfy declared counts
- [ ] Runtime API log has no 404
- [ ] `uiFidelity` exists and documents L2 screen-level observations
- [ ] Decision is explicit (`STOP` or `PASS`)

## Output format (structured)

- Findings
- Evidence refs
- Stop/Go decision
- Required fixes
- Confidence (High/Medium/Low + reason)
