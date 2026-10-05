# Acceptance Criteria

## Criteria

```gherkin
Feature: Declared layout anti-pattern review
  # AC-0001-0108-01
  Scenario: A layout anti-pattern caps the information-architecture score
    Given a screen review whose `layoutAntiPatternsDetected` is not empty
    When the reviewer scores the screen
    Then `informationArchitecture` is `weak` or `acceptable`

  # AC-0001-0108-02
  Scenario: Only declared layout anti-pattern IDs are recorded
    Given a layout problem the reviewer sees
    When the reviewer records it
    Then `layoutAntiPatternsDetected[]` holds only identifiers `packages/qfai/assets/validators/layoutAntiPatterns.json` declares
    And a problem the registry does not declare is named in a blocking finding instead
```
