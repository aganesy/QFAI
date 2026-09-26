# Acceptance Criteria

## Criteria

```gherkin
Feature: QA Gatekeeper Confirmation

# AC-0001-0095-01
# Parent: US-0001-0095
Scenario: QA Gatekeeper Sole Authority
  Given a RED observation by an implementation worker
  When confirmation is needed
  Then only qa-gatekeeper may confirm the observation; self-certification is rejected.
```
