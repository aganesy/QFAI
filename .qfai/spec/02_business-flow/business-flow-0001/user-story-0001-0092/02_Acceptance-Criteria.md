# Acceptance Criteria

## Criteria

```gherkin
Feature: QA Gatekeeper Confirmation
  # AC-0001-0092-01
  Scenario: QA Gatekeeper Sole Authority
    Given a RED observation by an implementation worker
    When confirmation is needed
    Then only qa-gatekeeper may confirm the observation; self-certification is rejected.
```
