# Acceptance Criteria

## Criteria

```gherkin
Feature: Orchestrator Protocol

# AC-0001-0169-01
# Parent: US-0001-0169
Scenario: Orchestrator No Direct Generation
  Given an Orchestrator invocation
  When it processes work
  Then it delegates to sub-agents and does not generate primary artifact first drafts directly.

# AC-0001-0169-02
# Parent: US-0001-0169
Scenario: Capability Probe Uses Real Delegation
  Given a skill stage starts
  When the first required delegation is attempted
  Then that real delegation attempt acts as the capability check and no preflight availability confirmation gates execution.

# AC-0001-0169-03
# Parent: US-0001-0169
Scenario: Delegation Failure Hard Stop
  Given the first required delegation fails
  When the orchestrator handles the failure
  Then it classifies the failure as `unavailable` or `saturated` and no simulated or self-executed fallback is used in either class. An `unavailable` failure stops the stage immediately and the user receives failure reason, failure class, attempted role/task, remediation guidance, and retry condition. A `saturated` failure holds the stage open for a bounded retry of the identical delegation and falls through to the same hard-stop report once the retry budget is exhausted.

# AC-0001-0169-04
# Parent: US-0001-0169
Scenario: No agent reviews its own authoring anywhere in a run
  Given a workflow run that has recorded the authors, recommenders and reviewers of its artifacts
  When a later work order names a required reviewer
  Then the work order carries that history
  And an agent instance recorded as the author or recommender of an artifact never counts as that artifact's independent reviewer
  And no required reviewer is dropped to save tokens

# AC-0001-0169-05
# Parent: US-0001-0169
Scenario: Grilling inside a run works only the remaining frontier
  Given a grilling session held inside a workflow run
  When it builds its frontier
  Then it takes what the work order's `settled` field records as settled, and works only the remaining frontier
  And it keeps the split between user sessions and delegated sessions
  And no run invokes `qfai-grill`

# AC-0001-0169-06
# Parent: US-0001-0169
Scenario: Work orders are recorded in one table
  Given a stage that delegates work orders
  When its artifact is written
  Then it carries a Work Orders Summary table with the columns Step, Role (sub-agent), Agent instance, Task title, Input (refs), Output (refs) and Status (PASS/REVISE/PENDING)
```
