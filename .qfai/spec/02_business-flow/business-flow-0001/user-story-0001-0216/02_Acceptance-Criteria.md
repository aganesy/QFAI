# Acceptance Criteria

## Criteria

```gherkin
Feature: Run every step of the route, reviewed once per stage
  # AC-0001-0216-01
  Scenario: A stage runs every step its route names
    Given a route whose stage lists its steps in order, some marked pass-through
    When the core issues the stage's work order
    Then the work order names every step of the stage, in plan order, with its mode and its pass-through mark
    And no step is left out for the request at hand

  # AC-0001-0216-02
  Scenario: A proposal cannot add or drop a step
    Given a route proposal that names optional steps, required stages or a route
    When the core checks the proposal
    Then it is refused as a malformed payload
    And routing stays where it was

  # AC-0001-0216-03
  Scenario: A stage that finds work its route does not do runs no other step
    Given a stage whose route has no step for work the change turns out to need
    When the stage finds it
    Then it runs no step its work order does not name
    And it reports the outcome of a declared branch point, or returns the finding for the operator

  # AC-0001-0216-04
  Scenario: A work order carries its steps and the union of their reviewers
    Given a stage whose steps are known
    When the core issues its work order
    Then the work order lists each step by name and by its project-root-relative `STEP.md` path, in plan order
    And it names no executor skill and no operation
    And its `requiredReviewerRoles` are the union of the `always_required` reviewers of each step's review profile, each role once
    And a step with no review profile adds no reviewer

  # AC-0001-0216-05
  Scenario: A stage is reviewed once, after its last step
    Given a stage work order naming several steps
    When the stage returns its result
    Then one result answers the whole work order
    And its review results hold one verdict for each required reviewer role, given after the last step

  # AC-0001-0216-06
  Scenario: A restored authorization raises the reviewers of implementation and acceptance steps only
    Given a run whose routing result carries `authorization-restored`
    When the core issues a work order
    Then a work order holding a step owned by `qfai-implement` or `qfai-atdd` takes the `implementation-heavy` reviewers for that step
    And a work order holding no such step keeps the union of its steps' own profiles
```
