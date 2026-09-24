# Acceptance Criteria

## Criteria

```gherkin
Feature: Four qualitative UX axes

# AC-0001-0110-01
# Parent: US-0001-0110
Scenario: Reviewer scores each covered screen on four axes
  Given a reviewer has operated a screen of a frozen UI contract
  When the reviewer writes its review payload
  Then information architecture, navigation flow, usability, and functionality each receive one of weak, acceptable, strong, or exceptional
  And an aesthetic weighted total or quantitative acceptance percentage is not used to decide convergence
```
