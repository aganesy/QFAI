# Acceptance Criteria

## Criteria

```gherkin
Feature: Cross-skill handoff schema
  # AC-0001-0171-01
  Scenario: Cross-skill handoff schema is the single canonical writer/reader
    Given any skill that produces or consumes handoff state,
    When it writes a handoff record,
    Then the record MUST conform to the canonical CLI-HANDOFF schema in `packages/qfai/src/core/schemas/handoff.ts` (documented in `references/handoff.md`) whose minimum field set is `companyName?` / `primaryUiContract?` / `startDate?` / `signature?` / `entryPattern?` / `productScope?` with `additionalProperties: true`. No other handoff file, such as a per-skill `session-handoff.yaml`, is read. An asymmetric edit of the SSOT-sync Pair IV (schema ↔ all skill writers) emits `QFAI-HANDOFF-001` at severity error with a non-empty `justification:`.
```
