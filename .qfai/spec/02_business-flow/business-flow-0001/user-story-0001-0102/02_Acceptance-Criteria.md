# Acceptance Criteria

## Criteria

```gherkin
Feature: Stable inputs for prototype evaluation
  # AC-0001-0102-01
  Scenario: Evaluator inputs are named before scoring
    Given reviewers prepare to evaluate a prototype
    When evaluator input guidance is read
    Then evaluator input guidance names the live prototype, root `DESIGN.md`, prior review context, and the layout anti-pattern catalog.
    And review guidance names the visual checklist categories used during scoring.
    And screenshots and HTML snapshots are additional inputs only when opt-in `--capture` produced them.
```
