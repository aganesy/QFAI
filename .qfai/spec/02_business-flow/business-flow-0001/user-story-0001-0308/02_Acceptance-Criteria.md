# Acceptance Criteria

## Criteria

```gherkin
Feature: Write, build and review a marketing page against its own patterns
  # AC-0001-0308-01
  Scenario: A marketing screen is written, built and reviewed against the marketing patterns
    Given a screen whose UI contract declares `surface: marketing`
    When the `sdd-contract` step writes its contract, `implement-tdd` builds it, or the product-surface reviewer reviews it
    Then each reads it against its section entries in the shipped `marketing-ui-patterns.md` and the marketing-screen floor in `interface-clarity.md`
    And the list of parts every business screen has applies to application screens only
```
