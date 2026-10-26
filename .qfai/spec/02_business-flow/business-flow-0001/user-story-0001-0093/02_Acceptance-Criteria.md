# Acceptance Criteria

## Criteria

```gherkin
Feature: Parallel Slice Dispatch
  # AC-0001-0093-01
  Scenario: Parallel Dispatch Authorization
    Given an implement stage with user stories in scope
    When the session agent applies the parallel-unit gate
    Then it gives a story to its own `fullstack-engineer` only when no EX of the story is annotated by a test yet and every pair of units passes every condition of the gate
    And it records the gate's result in the stage report and asks the user nothing
    And every other story runs serially in the session agent

  # AC-0001-0093-02
  Scenario: Read-only lookups fan out under the same gate
    Given discussion research, a grilling session or a web-research stage with lookup questions
    When the session agent applies the parallel-unit gate
    Then it gives each of two or more self-contained questions to a `fullstack-engineer` with no owned paths, which writes nothing and returns a cited answer
    And a question that needs another question's answer runs serially in the session agent
    And the session agent frames the questions and reads the answers into its own work
```
