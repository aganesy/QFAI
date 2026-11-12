# Acceptance Criteria

## Criteria

```gherkin
Feature: Reference Pool Authoring
  # AC-0001-0081-01
  Scenario: SDD translates references into local direction
    Given a deliberation record for a UI-bearing flow that settles component or competitive references
    When `/qfai-sdd` writes root `DESIGN.md`
    Then each reference has its adopted points under **Do**, its rejected points under **Don't** and in `audience.do_not_look_like`, and its local translation
    And competitive references are framed as material to deviate from, not a template to copy without change
```
