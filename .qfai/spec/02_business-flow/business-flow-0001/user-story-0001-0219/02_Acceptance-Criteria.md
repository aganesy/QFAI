# Acceptance Criteria

## Criteria

```gherkin
Feature: Read a run recorded under a retired route id
  # AC-0001-0219-01
  Scenario: An old route id is read as its successor
    Given a run record whose route is a retired id
    When `status` or a report reads it
    Then it shows the successor route, and the record is unchanged

  # AC-0001-0219-02
  Scenario: An unfinished run on a retired route cannot continue
    Given a non-terminal run whose route is a retired id
    When a write operation or `resume` is called
    Then it is refused fail-closed, naming the route
    And a stop still cancels it

  # AC-0001-0219-03
  Scenario: The migration notes name every retired id and what replaced it
    Given the migration notes the package ships
    When an adopter reads them
    Then each retired route id is listed with its successor
    And the retired proposal fields and plan predicates are named
```
