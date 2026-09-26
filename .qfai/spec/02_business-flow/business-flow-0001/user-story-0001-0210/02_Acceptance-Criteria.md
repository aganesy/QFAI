# Acceptance Criteria

## Criteria

```gherkin
Feature: Fix a defective example test with example coverage untouched

# AC-0001-0210-01
# Parent: US-0001-0210
Scenario: A test fix leaves example coverage untouched
  Given diagnosis found a defective existing test that checks an EX
  When /qfai-implement fixes the test in a test_fix stage
  Then the result names the ID the expectation checks before and after the fix
  And it carries an independent review and a re-run of the test
  And the fixed test annotates the same IDs it annotated before the fix
  And no story, contract or decisions.md file changes
  And the re-run is recorded in the flow's implement evidence file

# AC-0001-0210-02
# Parent: US-0001-0210
Scenario: A fix that changes the expectation's meaning goes back to SDD
  Given a test fix after which the expectation would check a different ID
  When the implement stage returns
  Then the result is needs_repair listing that finding with qfai-sdd as its resolving owner
  And no accepted test fix is returned

# AC-0001-0210-03
# Parent: US-0001-0210
Scenario: Implement takes a test fix only for a test that checks an EX
  Given a diagnosis with the verdict defective-test
  When the first ID it matches is an EX
  Then /qfai-implement serves the test_fix work order
  And it serves none when the first ID matched is a BF or an AC
```
