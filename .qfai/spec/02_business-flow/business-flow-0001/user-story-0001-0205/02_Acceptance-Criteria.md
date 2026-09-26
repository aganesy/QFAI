# Acceptance Criteria

## Criteria

```gherkin
Feature: Fix a defective acceptance test with example coverage untouched

# AC-0001-0205-01
# Parent: US-0001-0205
Scenario: A test fix leaves example coverage untouched
  Given diagnosis found a defective existing test that checks a BF or an AC
  When /qfai-atdd fixes the test in a test_fix stage
  Then the result names the ID the expectation checks before and after the fix
  And it carries an independent review and a re-run of the test
  And the fixed test annotates the same IDs it annotated before the fix
  And no story, contract or decisions.md file changes
  And the re-run is recorded in the flow's ATDD evidence file

# AC-0001-0205-02
# Parent: US-0001-0205
Scenario: A fix that changes the expectation's meaning goes back to SDD
  Given a test fix after which the expectation would check a different ID
  When the acceptance stage returns
  Then the result is needs_repair listing that finding with qfai-sdd as its resolving owner
  And no accepted test fix is returned

# AC-0001-0205-03
# Parent: US-0001-0205
Scenario: ATDD takes a test fix only for a test that checks a BF or an AC
  Given a diagnosis with the verdict defective-test
  When the first ID it matches is a BF or an AC
  Then /qfai-atdd serves the test_fix work order
  And it serves none when the first ID matched is an EX
```
