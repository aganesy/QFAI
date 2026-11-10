# Acceptance Criteria

## Criteria

```gherkin
Feature: Delegation Protocol
  # AC-0001-0163-02
  Scenario: Capability Probe Uses Real Delegation
    Given a skill stage runs
    When the session chooses to delegate
    Then the real delegation attempt acts as the capability check, no preflight availability confirmation gates execution, and no delegation attempt is required at the start of the stage.

  # AC-0001-0163-03
  Scenario: Delegation Failure Hard Stop
    Given a delegation the session chose to make fails
    When the session agent handles the failure
    Then it classifies the failure as `unavailable` or `saturated` and no simulated agent is used in either class. An `unavailable` failure lets the session do the work itself, unless the work is an independent judgement; there the stage stops and the user receives failure reason, failure class, attempted agent/task, remediation guidance, and retry condition. A `saturated` failure is retried as the identical delegation with bounded backoff and is handled as `unavailable` once the retry budget is exhausted.

  # AC-0001-0163-04
  Scenario: No agent reviews its own authoring
    Given an artifact an agent authored or recommended
    When a review of it is required
    Then that agent never counts as its independent reviewer
    And no required reviewer is dropped to save tokens

  # AC-0001-0163-07
  Scenario: The session delegates for two reasons only
    Given a step whose work the session agent could hand to a sub-agent
    When the work is neither an independent judgement of what the session produced nor two or more units that pass the parallel-unit gate
    Then the session agent does the work itself, whatever the size of its context or the technical domain of the work
    And a host's built-in agent is started only for one of the two reasons, while an agent that only stands in for a tool the host lacks counts as a tool call

  # AC-0001-0163-08
  Scenario: A judgement starts from a black-box brief
    Given a review, the finder, a griller or the prototyping evaluator is delegated
    When the session agent briefs it
    Then the sub-agent does not inherit the session's conversation
    And the brief holds the fixed revision, the request in the user's own words, the story tree and contracts that bind the work, the written decisions and the remit, and never the author's rationale or self-assessment
    And a host that can only fork the conversation is `unavailable` for the judgement, so the stage stops

  # AC-0001-0163-09
  Scenario: A skill run by name names its reviewer
    Given a skill that owns no step and holds a review
    When its review runs
    Then the reviewer is the one its body names, and no routing entry or review profile selects it

  # AC-0001-0163-10
  Scenario: A delegated task's first actions are checked and a wrong course is interrupted early
    Given the session agent hands a task to another agent and the user is in the session
    When the host shows the delegated agent's progress and its first actions go off course
    Then the session agent interrupts at once rather than waiting for the result
    And where the host shows nothing before the result, the result is the first check
    And for an independent judgement, off course means outside its brief or remit, a verdict the session disagrees with is never steered, and an interrupt restates only the brief's scope and remit

  # AC-0001-0163-11
  Scenario: After two corrections that do not land, the task restarts from a rewritten brief
    Given a delegated task in a session where the user is present
    When two corrections on that task do not land
    Then the session agent sends no third correction, stops the task and starts it again from a rewritten brief that carries what was learned
    And a rewritten judgement brief stays black-box, and when the rewritten brief goes off course the same way the session agent tells the user
    And nothing of this applies to a run under `--auto` or any run where nobody is present

  # AC-0001-0163-12
  Scenario: A unit work order carries what the files do not
    Given the session agent prepares a work order for a parallel unit
    When it fills the work order template
    Then the work order names the context not in the repository, such as decisions, procedures or reasons the files do not record, and the paths outside the unit the worker does not touch
    And a judgement work order leaves both fields out, so its brief holds no author reasoning
```
