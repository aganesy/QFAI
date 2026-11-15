# Acceptance Criteria

## Criteria

```gherkin
Feature: Review an implemented screen for missing states and a weak structure
  # AC-0001-0304-01
  Scenario: The product-surface reviewer checks structure and states on every review
    Given the shipped `product-surface-reviewer` card
    When the reviewer reviews an implemented screen
    Then the card requires the Information architecture and flow and the States and accessibility sections of `design-anti-patterns.md` as checks on every review
    And it leaves the severity of each finding to the shared reviewer findings rule

  # AC-0001-0304-02
  Scenario: The product-surface reviewer walks the same sourced checklist on every review
    Given the shipped `product-surface-reviewer` card and the shipped surface review checklist
    When the reviewer reviews a screen
    Then the card requires the checklist for every screen on every review, whatever the request's focus
    And the checklist lists Nielsen's ten usability heuristics, twelve WCAG 2.2 level A and AA criteria with their exceptions and one WAI-ARIA APG item per interactive widget, each with its source
    And every item is reported as pass, finding or not applicable
```
