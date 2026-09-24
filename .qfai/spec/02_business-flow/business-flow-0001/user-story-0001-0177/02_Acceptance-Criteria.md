# Acceptance Criteria

## Criteria

```gherkin
Feature: Cross-skill `handoff.yaml` schema

# AC-0001-0177-01
# Parent: US-0001-0177
Scenario: Cross-skill handoff schema is the single canonical writer/reader
  Given any skill that produces or consumes handoff state,
  When it writes a handoff file,
  Then the file MUST conform to the canonical CLI-HANDOFF schema in `packages/qfai/src/core/schemas/handoff.ts` (documented in `references/handoff.md`) whose minimum field set is `companyName?` / `primarySpecId?` / `startDate?` / `signature?` / `entryPattern?` / `productScope?` with `additionalProperties: true`. A legacy ad-hoc file (e.g. `session-handoff.yaml`) is accepted during the deprecation window with a `D-HANDOFF-LEGACY-FORMAT` warning. A non-conforming write, or an asymmetric edit of the SSOT-sync Pair IV (schema ↔ all skill writers), emits `R-HANDOFF-SCHEMA-DRIFT` at severity error with a non-empty `justification:`.
```
