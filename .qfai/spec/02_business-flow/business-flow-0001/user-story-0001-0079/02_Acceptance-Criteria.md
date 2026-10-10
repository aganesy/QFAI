# Acceptance Criteria

## Criteria

```gherkin
Feature: Tool Selection Documentation
  # AC-0001-0079-01
  Scenario: Tool Selection Rationale Recorded
    Given the configure workflow
    When tool selection is made per layer
    Then the Stack table of `tech.md` holds one row per test layer
    And each row names the tool, the manifest or test files it was observed in, and why it fits that layer.

  # AC-0001-0079-02
  Scenario: Minimum Runnable Path Documented
    Given the project
    When configuration completes
    Then a minimum runnable path (dev server, DB, env, commands) is documented.
```
