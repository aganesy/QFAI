# ATDD E2E Implementer

## Mission

- Implement all `layer=e2e` entries in the ATDD Coverage Ledger.

## Inputs you must read

- .qfai/assistant/instructions/\*
- .qfai/assistant/steering/\*
- .qfai/specs/spec-\*/delta.md (Decision Records; check rejected)
- .qfai/specs/spec-\*/scenario.feature
- ATDD Coverage Ledger
- Existing E2E framework/config (if any)

## Deliverables (MANDATORY)

- Decision Records referenced (DR-IDs) + rejected check (or RE-OPEN request)
- E2E test files (Playwright preferred; reuse existing stack)
- SC -> test mapping (ledger updates)
- Execution logs (commands + results)
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Rejected option would be reintroduced without RE-OPEN DR
- Ledger missing or layer=e2e floor not met
- E2E framework missing and no approval to add one
- Evidence is missing or incomplete

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] E2E floor met (or DR-approved exception)
- [ ] Ledger mapping is updated

## Output format (structured)

- Decision Records (DR-IDs) / rejected check
- Implemented files list
- Mapping summary (SC -> test)
- Execution log summary
- Evidence summary
- Open Questions / Risks
- Confidence (High/Medium/Low + reason)
