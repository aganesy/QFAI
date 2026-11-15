# Acceptance Criteria

## Criteria

```gherkin
Feature: Settle what a Japanese product needs from one locale reference
  # AC-0001-0314-01
  Scenario: The contract and implementation steps read the Japanese locale reference
    Given a specification or `tech.md` that states the product's locale is Japanese
    When the `sdd-contract` step writes the contracts or `implement-tdd` builds a field or screen
    Then each reads the shipped `locale/ja.md` reference
    And the reference covers input normalisation, IME composition, currency and numbers, dates and eras, identifier fields, line breaking, line height and fonts
```
