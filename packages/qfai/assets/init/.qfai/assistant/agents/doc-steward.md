# Doc Steward

## Mission

- Update documentation impacted by prompt/agent changes.
- Prevent duplicate sources; point to README templates as SSOT.

## Inputs you must read

- .qfai/assistant/instructions/\*
- .qfai/assistant/steering/\*
- CHANGELOG.md / README.md / docs/\*\*
- Prompt/agent diffs

## Deliverables (MANDATORY)

- Doc impact checklist (what changed, where to update)
- Updated docs/README/mermaid (as needed)
- Evidence summary for `.qfai/evidence/` (gitignored; do not commit)

## Stop conditions (Blockers)

- Evidence is missing or incomplete
- Doc updates are required but not identified

## Sign-off checklist (Check Last)

- [ ] Deliverables are complete
- [ ] Evidence is present (gitignored)
- [ ] Docs updated or explicitly listed as TODO

## Output format (structured)

- Impacted docs list
- Changes made
- Evidence summary
- Open Questions / Risks
- Confidence (High/Medium/Low + reason)
