# Legacy AC-0012-0051 before P7 split

Source: `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`, pre-split HEAD.
The current SDD splits this into AC-0012-0051 and AC-0012-0083.

## AC-0012-0051: Cycle-0 freezes spec set AND license catalog

- US-Refs: US-0012-0116, US-0012-0117
- Given cycle 0 runs,
- When it completes,
- Then cycle-0 evidence persists (a) the resolved spec set (frozen ID list) AND (b) the stock-photo license-class catalog (allowed sources + license tiers + attribution format) drawn from `OQ-0002` Option A.
- And every subsequent cycle reads both as SSOT for resolver / aggregator / license-verify.
