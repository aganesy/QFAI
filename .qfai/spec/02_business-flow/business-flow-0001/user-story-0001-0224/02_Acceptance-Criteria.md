# Acceptance Criteria

## Criteria

```gherkin
Feature: Follow a route in the session
  # AC-0001-0224-01
  Scenario: The session announces the plan and runs its steps in order
    Given a free-text change request in workflow mode `active`
    When the session has planned it
    Then it states the goal, the stages in plain words and the files it may change before the first stage
    And it runs every step the plan names, in plan order
    And the user names no stage

  # AC-0001-0224-02
  Scenario: The session may author any artifact
    Given a stage of the plan
    When the session does its work
    Then it writes the artifact itself, or gives independent parts to sub-agents to run in parallel
    And a review is done by an agent that did not author what it reviews

  # AC-0001-0224-04
  Scenario: A branch point moves the work to its destination route
    Given a step the plan marks as a branch point
    When it reports an outcome the plan pairs with a destination
    Then the session takes the destination's plan with `npx qfai workflow plan --route` and continues on it
    And a third such move is put to the user first

  # AC-0001-0224-05
  Scenario: A finding no step of the route serves stops the work
    Given a finding whose owner no stage of the route serves
    When the session meets it
    Then it stops and names the stage skill to invoke by name

  # AC-0001-0224-06
  Scenario: The workflow mode decides whether the session plans at all
    Given `workflow.mode` in `qfai.config.yaml`
    When a free-text request arrives
    Then `active` plans it, `shadow` states what would be done and writes nothing, and `off` leaves the stage skills to be invoked by name
```
