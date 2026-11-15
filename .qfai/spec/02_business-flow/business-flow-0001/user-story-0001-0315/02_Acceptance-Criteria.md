# Acceptance Criteria

## Criteria

```gherkin
Feature: Review every screen against the same sourced checklist
  # AC-0001-0315-01
  Scenario: The product-surface reviewer walks the shipped checklist on every review
    Given the shipped `product-surface-reviewer` card and the shipped surface review checklist
    When the reviewer reviews a screen
    Then the card requires the checklist for every screen on every review, whatever the request's focus
    And the checklist lists Nielsen's ten usability heuristics, twelve WCAG 2.2 level A and AA criteria and one WAI-ARIA APG item per interactive widget, each with its source
    And every item is reported as pass, finding or not applicable
```
