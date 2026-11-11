# Acceptance Criteria

## Criteria

```gherkin
Feature: Diagnose a reported defect without changing product code
  # AC-0001-0201-02
  Scenario: A diagnosis returns one verdict and what supports it
    Given a diagnose stage
    When it returns
    Then it reports exactly one verdict: a missing test, a defective test, a regression, an expectation that differs from the request, or one of the verdicts that end the work or move it to another route
    And it names the BF, AC or EX IDs of the flow that the next stage acts on
    And the reproduction, the cause candidates and the impact are in the record it names

  # AC-0001-0201-03
  Scenario: A diagnosed missing test goes to no specification change from implement
    Given diagnosis found a missing test on behaviour an existing AC states
    When /qfai-implement handles that scope gap
    Then it sends nothing to /qfai-sdd
    And where no EX states the case, implement-tdd appends one under that AC
    And the statement of what goes to /qfai-sdd as a specification change states that carve-out
    And any other scope gap still goes to /qfai-sdd as a specification change
```
