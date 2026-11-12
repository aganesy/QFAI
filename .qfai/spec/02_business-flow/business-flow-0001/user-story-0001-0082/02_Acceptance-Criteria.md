# Acceptance Criteria

## Criteria

```gherkin
Feature: Design Anti-Goals
  # AC-0001-0082-01
  Scenario: SDD records rejected design patterns
    Given a deliberation record in which the user rejected a generic or unsuitable visual direction
    When `/qfai-sdd` writes root `DESIGN.md`
    Then its **Don't** subsection records the anti-goal and the reason the direction was rejected
    And it records a concrete cue that will prevent the rejected pattern from recurring in downstream design review
```
