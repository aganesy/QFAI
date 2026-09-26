# Acceptance Criteria

## Criteria

```gherkin
Feature: Implement as a stage of a run

# AC-0001-0207-01
# Parent: US-0001-0207
Scenario: The implement stage follows the stage-skill handover
  Given workflow mode active
  When /qfai-implement is selected with no work order and not by name
  Then it edits nothing and passes the request to qfai-run
  And a worker handed a work order checks the run, stage and work-order IDs and does only that work
  And SKILL.md cites references/orchestrated-mode.md with one line

# AC-0001-0207-02
# Parent: US-0001-0207
Scenario: The Operations table lists what the plan vocabulary assigns to qfai-implement
  Given the qfai-implement reference references/orchestrated-mode.md
  When its Operations table is read
  Then it lists exactly the operations the plan vocabulary assigns to qfai-implement, seam-only included

# AC-0001-0207-03
# Parent: US-0001-0207
Scenario: The bound flow supplies the flow scope without asking
  Given an implement work order whose target binds a business flow
  When the stage starts
  Then that flow is the stage's --flow scope and no question chooses it
  And with no work order the flow is chosen as it is when the skill is invoked by name

# AC-0001-0207-04
# Parent: US-0001-0207
Scenario: A long stage resumes at an example boundary
  Given an implement work order carrying a checkpoint reference and a legal operation
  When the stage resumes
  Then it starts at the EX the checkpoint names
  And its result names EX IDs and records no progress state of its own
  And the skill's own phase order is unchanged

# AC-0001-0207-05
# Parent: US-0001-0207
Scenario: The next-example check is never served from the shared snapshot
  Given an active run whose shared preflight snapshot is valid
  When the implement stage starts
  Then it may reuse the snapshot for the inputs the snapshot covers
  And it runs its own flow-scoped validate to find the examples no test annotates

# AC-0001-0207-06
# Parent: US-0001-0207
Scenario: A seam-only work order lands only the minimal connection
  Given a seam-only work order naming the acceptance test that cannot reach its assertion
  When /qfai-implement serves it
  Then it lands only the minimal connection, through the existing minimal-seam step
  And the target test still fails at its assertion
  And the main implementation waits until the acceptance stage has taken RED
```
