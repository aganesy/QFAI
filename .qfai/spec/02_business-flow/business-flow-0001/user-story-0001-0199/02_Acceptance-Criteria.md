# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion steps as a stage of a route
  # AC-0001-0199-03
  Scenario: The discussion skill lists the steps the plans run for discussion
    Given the qfai-discussion SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-discussion
    And every step a plan gives a discussion stage is one of them
```
