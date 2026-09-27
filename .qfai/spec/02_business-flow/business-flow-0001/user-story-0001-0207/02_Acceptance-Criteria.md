# Acceptance Criteria

## Criteria

```gherkin
Feature: Implement as a stage of a run
  # AC-0001-0207-01
  Scenario: The implement stage follows the stage-skill handover
    Given workflow mode active
    When /qfai-implement is selected with no work order and not by name
    Then it edits nothing and passes the request to qfai-run
    And a worker handed a work order checks the run, stage and work-order IDs and does only that work

  # AC-0001-0207-02
  Scenario: qfai-implement lists the steps the plans and seam requests run
    Given the qfai-implement SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-implement, implement-seam included
    And every step a plan gives a diagnose, implement or regression_fix stage, and the example-layer step of a test_fix stage, is one of them

  # AC-0001-0207-03
  Scenario: The bound flow supplies the flow scope without asking
    Given an implement work order whose target binds a business flow
    When the stage starts
    Then that flow is the stage's --flow scope and no question chooses it
    And with no work order the flow is chosen as it is when the skill is invoked by name

  # AC-0001-0207-04
  Scenario: A long stage resumes at an example boundary
    Given an implement work order carrying a checkpoint reference
    When the stage resumes
    Then it starts at the EX the checkpoint names
    And its result names EX IDs and records no progress state of its own
    And the order of the TDD cycle within each example is unchanged

  # AC-0001-0207-05
  Scenario: The next-example check is never served from the shared snapshot
    Given an active run whose shared preflight snapshot is valid
    When the implement stage starts
    Then it may reuse the snapshot for the inputs the snapshot covers
    And it runs its own flow-scoped validate to find the examples no test annotates

  # AC-0001-0207-06
  Scenario: An implement-seam work order lands only the minimal connection
    Given an implement-seam work order naming the acceptance test that cannot reach its assertion
    When /qfai-implement serves it
    Then it lands only the minimal connection, through the implement-seam step
    And the target test still fails at its assertion
    And the main implementation waits until the acceptance stage has taken RED
```
