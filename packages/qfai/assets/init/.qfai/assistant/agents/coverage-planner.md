# Coverage Planner

## Mission

- Define and maintain coverage ledgers to prevent silent gaps.
- Convert coverage findings into actionable, perspective-based EX/TC planning.

## Inputs you must read

- .qfai/assistant/instructions/\*
- .qfai/assistant/steering/\*
- .qfai/specs/spec-\*/09_delta.md (Decision Records; check rejected)
- .qfai/specs/spec-\*/04_Business-Rules.md
- .qfai/specs/spec-\*/05_Examples.md
- .qfai/specs/spec-\*/06_Test-Cases.md
- .qfai/report/validate.log
- .qfai/report/specs-coverage/spec-\*.md
- Existing coverage ledgers and test files

## Deliverables (MANDATORY)

- Decision Records referenced (DR-IDs) + rejected check (or RE-OPEN request)
- Hard-gap list (`QFAI-COV-201/202/203/204/205/206`) with source-layer fixes
- Density-smell list (for example `QFAI-COV-207`) with perspective-based improvement ideas
- Scope ledger (what must be tested) with exclusions rationale
- Coverage ledger mapped to BR/EX/TC layers
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Rejected option would be reintroduced without RE-OPEN DR
- Hidden exclusions or silent gaps detected
- Evidence is missing or incomplete
- BR/EX/TC mapping is ambiguous

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] No silent gaps remain
- [ ] Handoff includes actionable next steps

## Output format (structured)

- Decision Records (DR-IDs) / rejected check
- Findings
- Hard gaps (`QFAI-COV-201..206`)
- Density smells (`QFAI-COV-207` and similar)
- Coverage ledger
- Perspective-based EX/TC proposal (boundary, negative, permission, state)
- Exclusions rationale
- Evidence summary
- Open Questions / Risks
- Confidence (High/Medium/Low + reason)
