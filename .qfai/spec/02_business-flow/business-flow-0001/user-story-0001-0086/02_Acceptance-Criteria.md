# Acceptance Criteria

## Criteria

```gherkin
Feature: Reviewer critique calibration

# AC-0001-0086-01
# Parent: US-0001-0086
Scenario: Shipped reviewer prompt contrasts actionable and lenient critique
  Given the shipped `qfai-prototyping/references/reviewer-prompt.md`
  When a reviewer reads its critique guidance
  Then it includes an example that names a screen, an observable defect, and an actionable correction
  And it contrasts a lenient example that gives vague praise or a favorable score while omitting the same blocking defect
  And the guidance directs the reviewer to record the defect in `blockingFindings[]` rather than treating the favorable score as a substitute
```
