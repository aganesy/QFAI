# Acceptance Criteria

## Criteria

```gherkin
Feature: Policy and governance framework
  # AC-0001-0004-01
  Scenario: The canonical workflow stages are defined
    Given the policy and governance specification
    When the canonical workflow stages are read
    Then six stages are defined, from Stage 1 (discussion) to Stage 6 (verify)
    And the policy check is not a stage: it runs once per run, at its start, before the first stage, and no stage runs it again
    And Stage 1 (discussion) and Stage 4 (prototyping) are optional
    And Stage 5 (implementation) writes the acceptance tests with empty bodies and runs TDD for each EX

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
