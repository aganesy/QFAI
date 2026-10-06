# Acceptance Criteria

## Criteria

```gherkin
Feature: Choose how far the work on a request goes before it starts
  # AC-0001-0229-01
  Scenario: A plan from an extraction offers its scopes, narrowest first
    Given an extraction naming the artifacts the request asks to change
    When `npx qfai workflow plan --in <path>` returns a plan or candidates
    Then the plan, and each candidate, holds its distinct scopes, narrowest first, each a set of the route's stages in plan order
    And the narrowest scope is recommended
    And a scope that writes code or tests also holds the route's closing verification stages
    And a scope that writes only documentation holds them too

  # AC-0001-0229-02
  Scenario: The session asks for the scope before the first stage
    Given a plan, or a chosen candidate, with two or more scopes
    When the session starts the work
    Then it puts one single-select question with one option per scope, narrowest first and recommended, each naming the stages it runs in plain words
    And it runs only the stages of the chosen scope, announcing those alone
    And the final report states that the chosen stages are complete, never that the change is done

  # AC-0001-0229-03
  Scenario: A plan with one scope or none asks nothing
    Given a plan with one scope, a plan with no scopes, or a branch destination's plan
    When the session runs it
    Then it puts no scope question and runs every stage of the route
    And a branch move from a scope that leaves stages out is asked first

  # AC-0001-0229-04
  Scenario: A no-question mode takes the narrowest scope
    Given a plan with two or more scopes under a no-question mode
    When the session starts the work
    Then it takes the narrowest scope and the final report lists the choice as an assumption
    And a release point outside the chosen scope is not asked

  # AC-0001-0229-05
  Scenario: A free-text answer chooses stages of the plan only
    Given the scope question and a free-text answer
    When the answer names stages of the plan
    Then the session runs the stages up to the last one it names, in plan order
    And when it asks for work no stage of the plan does, the session stops and names that work

  # AC-0001-0229-06
  Scenario: A request that ends before implementation lists no tests
    Given a request to change the specification and a prototype only
    When the session reads it into an extraction
    Then `artifacts` names what the request asks to change and holds no `tests` or `code`

  # AC-0001-0229-07
  Scenario: A request whose artifacts no stage of the route writes stops before the first stage
    Given an extraction naming artifacts, a route with stages that write, and no stage that writes any of them
    When `npx qfai workflow plan --in <path>` runs
    Then it refuses and names each artifact no stage writes
    And the session stops before the first stage and names the artifact in plain words
    And a route no stage of which writes is not refused
```
