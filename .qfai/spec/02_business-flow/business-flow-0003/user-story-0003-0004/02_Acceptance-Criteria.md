# Acceptance Criteria

## Criteria

```gherkin
Feature: Legacy file layout
  # AC-0003-0004-01
  Scenario: A legacy file layout is warned about
    Given a legacy file layout is detected
    When `qfai doctor` runs
    Then a legacy warning is shown
```
