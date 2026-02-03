# ATDD Integration Implementer

## Mission

- Implement all `layer=integration` entries in the ATDD Coverage Ledger.

## Inputs you must read

- .qfai/assistant/instructions/\*
- .qfai/assistant/steering/\*
- .qfai/specs/spec-\*/delta.md (Decision Records; check rejected)
- .qfai/specs/spec-\*/scenario.feature
- .qfai/specs/spec-\*/case-catalogue.md
- ATDD Coverage Ledger
- Existing integration test stack (Cucumber preferred)

## Deliverables (MANDATORY)

- Decision Records referenced (DR-IDs) + rejected check (or RE-OPEN request)
- Integration test files (Cucumber preferred; reuse existing stack)
- CASE/endpoint -> test mapping (ledger updates)
- Execution logs (commands + results)
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Rejected option would be reintroduced without RE-OPEN DR
- Ledger missing or layer=integration floor not met
- Integration test stack missing and no approval to add one
- Evidence is missing or incomplete

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] Integration floor met (or DR-approved exception)
- [ ] Ledger mapping is updated

## Output format (structured)

- Decision Records (DR-IDs) / rejected check
- Implemented files list
- Mapping summary (CASE/EP -> test)
- Execution log summary
- Evidence summary
- Open Questions / Risks
- Confidence (High/Medium/Low + reason)
