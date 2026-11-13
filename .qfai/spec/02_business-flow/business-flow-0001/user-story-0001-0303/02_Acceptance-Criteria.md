# Acceptance Criteria

## Criteria

```gherkin
Feature: Read the grilling rule's procedures only when they apply
  # AC-0001-0303-01
  Scenario: The rule keeps each trigger and points to its procedure
    Given the shipped `.agents/rules/grilling.md`
    When an agent reads it for discussion delegation, the glossary check or the check before a session is reported finished
    Then the rule states when the case applies and names a reference under the `qfai-grilling` skill, saying when to read it and when it is not needed

  # AC-0001-0303-02
  Scenario: The skill cites each reference it loads
    Given the shipped `qfai-grilling` skill
    When `qfai validate` checks its references
    Then each reference the rule points to is cited from the skill's `SKILL.md`
```
