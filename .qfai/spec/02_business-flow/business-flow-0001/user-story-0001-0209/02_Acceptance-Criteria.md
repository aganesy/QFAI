# Acceptance Criteria

## Criteria

```gherkin
Feature: Fix a regression an existing correct test catches, leaving the covered example covered

# AC-0001-0209-01
# Parent: US-0001-0209
Scenario: A regression fix changes production code only
  Given an existing, correct test annotating an EX of the bound flow now fails
  When /qfai-implement serves the regression_fix work order
  Then it changes production code only, and no test, story or contract file
  And the EX is still annotated by that test
  And no change request row is appended and no evidence entry is deleted

# AC-0001-0209-02
# Parent: US-0001-0209
Scenario: The same test turning GREEN confirms a regression fix
  Given a regression fix against a covered EX
  When the stage returns
  Then the same test has run GREEN again
  And the stage result carries the fix's receipt naming that test, its GREEN re-run and its independent review
  And the fix and the re-run are recorded in the flow's implement evidence file
```
