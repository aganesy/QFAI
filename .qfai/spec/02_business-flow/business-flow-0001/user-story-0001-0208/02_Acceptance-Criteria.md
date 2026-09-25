# Acceptance Criteria

## Criteria

```gherkin
Feature: Diagnose a reported defect without changing product code

# AC-0001-0208-01
# Parent: US-0001-0208
Scenario: A diagnose-only operation changes no tracked project file
  Given a diagnose-only work order with the expected-behaviour reference and the scope
  When /qfai-implement serves it
  Then no file git tracks is changed, so no product code, test or story file differs
  And a file it writes that git ignores, such as its reproduction record, is named as an artifact, not as a changed file

# AC-0001-0208-02
# Parent: US-0001-0208
Scenario: A diagnosis returns one verdict and what supports it
  Given a diagnose-only work order
  When the stage returns
  Then the result carries exactly one verdict: a missing test, a defective test, a regression, or an expectation that differs from the request
  And it names the BF, AC or EX IDs of the bound flow that the next work order acts on
  And the reproduction, the cause candidates and the impact are in the record the result references

# AC-0001-0208-03
# Parent: US-0001-0208
Scenario: A diagnosed missing test raises no change request from implement
  Given diagnosis found a missing test on behaviour an existing AC states
  When /qfai-implement handles that scope gap
  Then it appends no change request row to decisions.md and adds no EX
  And the skill's statement of what goes to /qfai-sdd as a change request states that carve-out
  And any other scope gap still goes to /qfai-sdd as a change request
```
