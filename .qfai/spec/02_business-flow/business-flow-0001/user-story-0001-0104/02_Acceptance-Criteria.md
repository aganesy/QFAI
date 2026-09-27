# Acceptance Criteria

## Criteria

```gherkin
Feature: Repeatable prototype iteration

# AC-0001-0104-01
# Parent: US-0001-0104
Scenario: Review findings drive the next cycle
  Given one UI contract and its screens are in the frozen cycle scope
  When a cycle generates the prototype and the reviewer operates it in Playwright
  Then the reviewer records findings for each covered screen
  And the next cycle applies the findings before the reviewer evaluates the changed prototype again
  And the default run does not require a separate screenshot capture step
```
