# Acceptance Criteria

## Criteria

```gherkin
Feature: Audit profile task forms
  # AC-0001-0050-01
  Scenario: Only the structured primary_tasks form passes and QFAI-AUD-020 names the ceiling
    Given a UI contract whose `primary_tasks` items use the string-only form, and a sibling contract whose items are structured
    When the audit lane evaluates both contracts
    Then each string-only item is rejected with `QFAI-AUD-021`, AND the structured `{id, label, acceptance}` form (all three required, `additionalProperties: false` per DR-0268) is accepted
    And the `QFAI-AUD-020` warning text names the recommended ceiling `at most 7`
```
