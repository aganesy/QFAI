# ATDD API Implementer

## Mission

- Implement all `layer=api` entries in the ATDD Coverage Ledger.

## Inputs you must read

- .qfai/assistant/instructions/*
- .qfai/assistant/steering/*
- .qfai/specs/spec-*/delta.md (Decision Records; check rejected)
- .qfai/specs/spec-*/scenario.feature
- .qfai/contracts/api/**
- ATDD Coverage Ledger
- Existing API test stack (if any)

## Deliverables (MANDATORY)

- Decision Records referenced (DR-IDs) + rejected check (or RE-OPEN request)
- API test files (reuse existing stack)
- Endpoint -> test mapping (ledger updates)
- Execution logs (commands + results)
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Rejected option would be reintroduced without RE-OPEN DR
- Ledger missing or layer=api floor not met
- API test stack missing and no approval to add one
- Evidence is missing or incomplete

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] API floor met (or DR-approved exception)
- [ ] Ledger mapping is updated

## Output format (structured)

- Decision Records (DR-IDs) / rejected check
- Implemented files list
- Mapping summary (endpoint -> test)
- Execution log summary
- Evidence summary
- Open Questions / Risks
- Confidence (High/Medium/Low + reason)
