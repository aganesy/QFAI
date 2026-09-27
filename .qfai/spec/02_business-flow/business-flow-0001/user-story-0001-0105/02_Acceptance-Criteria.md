# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0105-01
# Parent: US-0001-0105
Scenario: AC-0001-0105-01
  Given reviewers prepare to evaluate a prototype
  When evaluator input guidance is read
  Then evaluator input guidance names the live prototype, root `DESIGN.md`, prior review context, and the layout anti-pattern catalog.
  And review guidance names the visual checklist categories used during scoring.
  And screenshots and HTML snapshots are additional inputs only when opt-in `--capture` produced them.
```
