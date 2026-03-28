# 12 OQ Resolution Log

## Resolution Timeline

| Date | OQ-ID | Action | Details |
| ---- | ----- | ------ | ------- |
| 2026-03-28 | OQ-0001 | resolved | Chose minimal-but-complete verbosity (Option B). Rationale: balances authoring friction (NFR-0003) with downstream readability. One complete example per sidecar artifact type provides enough guidance without bloat. |
| 2026-03-28 | OQ-0002 | resolved | Chose surface-type-only classification (Option B). Rationale: interaction complexity is subjective and hard to automate; surface type (web-ui, mobile-ui, non-ui) is deterministic and aligns with existing init path branching. |
| 2026-03-28 | OQ-0003 | deferred | Deferred to SDD phase. Screen contracts will reference CON-UI-* IDs (Option B recommended). Bridging details depend on CON-UI schema analysis not yet available. |
| 2026-03-28 | OQ-0004 | deferred | Deferred to v1.7.4. Reviewer output schema depends on validator implementation (v1.7.4 scope). JSON schema (Option A) recommended for machine-readability. |

## Rules

- This log is append-only.
- Each entry must reference the OQ-ID from `11_OQ-Register.md`.
- Include rationale for every resolution action.
