# Acceptance Criteria

## Criteria

```gherkin
Feature: Plan a request's route with one command
  # AC-0001-0222-01
  Scenario: An extraction from a file returns the route plan
    Given an extraction of a request in a JSON file
    When `npx qfai workflow plan --in <path>` runs
    Then it prints one JSON document holding the route plan and exits 0
    And it creates, changes and removes no file

  # AC-0001-0222-02
  Scenario: An extraction from standard input returns the same plan
    Given the same extraction on standard input
    When `npx qfai workflow plan --in -` runs
    Then it prints the plan the file gives

  # AC-0001-0222-03
  Scenario: A route named directly returns its plan
    Given a route the catalog names
    When `npx qfai workflow plan --route <route>` runs
    Then it prints that route's plan

  # AC-0001-0222-04
  Scenario: Invalid input is refused
    Given an invalid extraction, an unknown route, an unknown operation, or both or neither of `--in` and `--route`
    When the command runs
    Then it exits 2 with one JSON document holding `ok: false` and the reasons
    And it writes nothing

  # AC-0001-0222-05
  Scenario: A low-confidence extraction returns its candidates
    Given an extraction at `confidence: low` with its alternative readings
    When the command runs
    Then it returns the candidate routes, ordered by the decision rules, with the main reading's route recommended
    And it returns no plan

  # AC-0001-0222-06
  Scenario: The session asks which candidate route to take
    Given candidate routes that `plan` returned
    When the session handles them
    Then it puts one single-select question, each option saying in plain words what that route will do, and plans the chosen route with `--route`
    And under a no-question mode it takes the first candidate and the final report lists the choice as an assumption

  # AC-0001-0222-07
  Scenario: An input file that cannot be read is an I/O error
    Given `--in` names a file that cannot be read
    When the command runs
    Then it exits 1 with one JSON document holding `ok: false` and the reason `io-error`
    And it writes nothing
```
