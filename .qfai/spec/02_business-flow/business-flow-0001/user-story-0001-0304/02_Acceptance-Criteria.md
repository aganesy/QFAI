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
```
