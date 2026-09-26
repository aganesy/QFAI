# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0052-01
# Parent: US-0001-0052
Scenario: AC-0001-0052-01
  Given a UI contract whose `primary_tasks` items use the legacy string-only form
  When `auditProfile.ts` evaluates the contract
  Then the string-only items continue to PASS during the deprecation window, AND a structured `{id, label, acceptance}` (all three required, `additionalProperties: false` per DR-0268) form is also accepted
  And the `QFAI-AUD-020` warning text names the recommended count band `3..7` (per DR-0267)
```
