# Acceptance Criteria

## Criteria

```gherkin
Feature: `primary_tasks` ceiling + accepted shape documented
  # AC-0001-0155-01
  Scenario: `primary_tasks` ceiling documented and named in warning
    Given the `ui-contract.sample.yaml` template comments and `references/ui-contract-guide.md`,
    When they are read,
    Then the recommended ceiling of 7 `primary_tasks` per screen is documented, and the `QFAI-AUD-020` warning text names it
    And a screen declaring more than 7 emits the warning, while one declaring 1 to 7 does not, because there is no floor

  # AC-0001-0155-02
  Scenario: `primary_tasks` accepts only the structured shape
    Given a UI contract whose `primary_tasks` entries are structured `{id, label, acceptance}` (all-required, closed schema per DR-0268) or plain strings,
    When the audit lane evaluates them,
    Then a complete structured item is accepted; a plain string item, a structured item missing any of `id` / `label` / `acceptance`, or one carrying extra keys, is rejected.
```
