# Acceptance Criteria

## Criteria

```gherkin
Feature: Design Anti-Goals
  # AC-0001-0084-01
  Scenario: UI-bearing discussion records rejected design patterns
    Given a UI-bearing discussion rejects a generic or unsuitable visual direction
    When `04_Sources.md` is finalized
    Then it records the anti-goal and the reason the direction was rejected
    And it records a concrete cue that will prevent the rejected pattern from recurring in downstream design review
```
