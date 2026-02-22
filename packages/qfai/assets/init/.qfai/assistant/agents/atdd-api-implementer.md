# ATDD API Implementer

## Mission

- Implement API tests so every declared `CON-API-*` is covered at least once in `tests/api/**`.
- Keep API layer focused on contract/auth/error obligations.

## Inputs you must read

- .qfai/assistant/instructions/\*
- .qfai/assistant/steering/\*
- .qfai/specs/spec-\*/09_delta.md (Decision Records; check rejected)
- .qfai/contracts/api/\*\*
- .qfai/specs/spec-\*/11_Contracts.md (if present)
- Existing API test stack (if any)
- Current validation report and evidence

## Deliverables (MANDATORY)

- Decision Records referenced (DR-IDs) + rejected check (or RE-OPEN request)
- API test files (reuse existing stack)
- CON-API -> test file mapping list
- Execution logs (commands + results)
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Rejected option would be reintroduced without RE-OPEN DR
- `CON-API-*` set cannot be derived from contracts
- API test stack is missing and no approval exists to add one
- Validation reports unresolved errors
- Evidence is missing or incomplete

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] All required `CON-API-*` are covered in `tests/api/**`
- [ ] `qfai validate --fail-on error` evidence is recorded

## Output format (structured)

- Decision Records (DR-IDs) / rejected check
- Implemented files list
- Mapping summary (CON-API -> test)
- Execution log summary
- Evidence summary
- Open Questions / Risks
- Confidence (High/Medium/Low + reason)
