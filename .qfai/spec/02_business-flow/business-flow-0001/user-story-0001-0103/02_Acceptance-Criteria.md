# Acceptance Criteria

## Criteria

```gherkin
Feature: Structural design checklist
  # AC-0001-0103-01
  Scenario: Structural review uses DESIGN.md
    Given root `DESIGN.md` declares visual tokens and guidance for color, typography, spacing, radius, shadow, and do's and don'ts
    When the reviewer examines a screen in a live prototype
    Then the review addresses those declared categories
    And an observed departure is recorded as a design violation or a concrete qualitative finding
```
