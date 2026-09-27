# Acceptance Criteria

## Criteria

```gherkin
Feature: Run only the steps a change needs, reviewed once per stage
  # AC-0001-0216-01
  Scenario: A stage runs only the steps its plan and proposal make active
    Given a built-in plan whose stage lists its steps in order, some gated by `proposed`
    And a checked route proposal whose `optionalSteps` names some of those gated steps
    When the core issues the stage's work order
    Then the work order names every step of the stage whose predicate holds, in plan order
    And a step gated by `proposed` is named only when `optionalSteps` lists it

  # AC-0001-0216-02
  Scenario: A proposal may only propose a step its plan leaves to the proposal
    Given a route proposal whose `optionalSteps` names a step
    When the core checks the proposal
    Then it is refused `proposal-refused` with reason `stage-set` when the plan does not gate that step with `proposed`
    And routing stays where it was

  # AC-0001-0216-03
  Scenario: A stage that needs an unproposed step goes back to routing
    Given a stage whose work order does not name a step the plan gates with `proposed`
    When the stage finds that the change needs that step
    Then it runs no step its work order does not name
    And its result returns the run to `routing`
    And a checked proposal that lists the step makes the next work order of that stage name it

  # AC-0001-0216-04
  Scenario: A work order carries its steps and the union of their reviewers
    Given a stage whose active steps are known
    When the core issues its work order
    Then the work order lists each active step by name and by its project-root-relative `STEP.md` path, in plan order
    And it names no executor skill and no operation
    And its `requiredReviewerRoles` are the union of the `always_required` reviewers of each active step's review profile, each role once
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
