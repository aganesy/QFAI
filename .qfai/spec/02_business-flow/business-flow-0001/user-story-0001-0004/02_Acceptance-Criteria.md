# Acceptance Criteria

## Criteria

```gherkin
Feature: Steering and governance framework
  # AC-0001-0004-01
  Scenario: The canonical workflow stages are defined
    Given the steering and governance specification
    When the canonical workflow stages are read
    Then eight stages are defined, from Stage 0 (steering refresh) to Stage 7 (verify)
    And Stage 0 is required at the start of every skill
    And Stage 4 (prototyping) is optional
    And Stage 6 (implementation) runs TDD for each EX

  # AC-0001-0004-02
  Scenario: Stage 0 reuses a validated snapshot inside an active run
    Given an active workflow run in which an earlier stage wrote its Stage 0 output with the key it was computed under
    When a later stage of the same run starts
    Then it recomputes the key and reuses the output only when the key is equal
    And when the key differs it refreshes only what changed
    And no stage-specific check is served from the reused output
    And outside a run Stage 0 runs in full at every stage start

  # AC-0001-0004-03
  Scenario: The governance text states what authorizes a run's work
    Given the shipped `constitution.md` and the shared operating and delegation baselines
    When they are read
    Then they state that the operator's first explicit request authorizes the normal change it allows, within the run's checked scope
    And they state that a work order binds its stage to the one target it names
    And every article keeps its text, and none gains an exception

  # AC-0001-0004-04
  Scenario: A workflow route is not a change type
    Given the shipped `workflow.md`
    When it is read
    Then it states that the workflow routes are orthogonal to the Change Type values
    And choosing a route selects no Change Type, and a Change Type selects no route

  # AC-0001-0004-05
  Scenario: The constitution's articles are non-negotiable
    Given the shipped `constitution.md`
    When its articles are read
    Then it lists Articles I to XI as non-negotiable rules, with no exception
```
