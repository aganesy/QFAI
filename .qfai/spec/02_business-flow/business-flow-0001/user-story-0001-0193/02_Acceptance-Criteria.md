# Acceptance Criteria

## Criteria

```gherkin
Feature: Repair a bug the stories already describe without uncovering an example

# AC-0001-0193-01
# Parent: US-0001-0193
Scenario: A missing test is written against the example that states the case
  Given diagnosis returns the missing-test verdict
  When the plan continues
  Then an example that already states the case needs no story-authoring stage, and acceptance or implement writes its test
  And when no example states it, the next stage is `sdd_append`, carrying the diagnosis as the reason
  And acceptance runs under `acceptance_obligations_unmet`, then implement and a full verify follow

# AC-0001-0193-02
# Parent: US-0001-0193
Scenario: A regression caught by an existing test is fixed against its covered example
  Given diagnosis returns the regression verdict for an example a test annotates
  When the plan continues
  Then the next stage is `regression_fix`, then a full verify
  And the example stays annotated
  And the fix is accepted only with the same test's GREEN re-run and an independent review

# AC-0001-0193-03
# Parent: US-0001-0193
Scenario: No stage uncovers an example or adds one it does not own
  Given a bugfix run over a flow whose covering example a test annotates
  When a stage result leaves that example with no annotating test, or adds an example from a stage other than story authoring
  Then `accept` refuses the result
  And the obligation set is unchanged

# AC-0001-0193-04
# Parent: US-0001-0193
Scenario: A different expectation is routed as a bounded change
  Given a bug report whose stated expectation differs from the stories, or that no story covers
  When routing or diagnosis reaches that finding
  Then the run is reclassified to `bounded-change` before any edit
  And no unfinished obligation is dropped by the reclassification
```
