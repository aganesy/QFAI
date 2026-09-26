# Acceptance Criteria

## Criteria

```gherkin
Feature: Deliver a clear new feature from one request

# AC-0001-0192-01
# Parent: US-0001-0192
Scenario: Each new story is approved once, at routing
  Given a clear feature request whose checked plan needs a story no existing story represents
  When routing completes
  Then the run asks one `create` question per new-story slot, all in one round, before any story-authoring work order
  And each answer is recorded through `decision` as a `human_decision`
  And no later stage asks that question again

# AC-0001-0192-02
# Parent: US-0001-0192
Scenario: The story-authoring work order carries the approval, and a stale or unrecorded one is asked again
  Given the operator approved a new story at routing
  When the core issues and later accepts the story-authoring work order
  Then the work order carries the approval bound to its `new_story` slot
  And an approval that is stale, does not match, or has no recorded authorization sends the run to `awaiting_input` with a new `create` question

# AC-0001-0192-03
# Parent: US-0001-0192
Scenario: Declining a new story ends the run with nothing tracked
  Given the run is waiting on a `create` question
  When the operator answers do not create it
  Then the run ends `cancelled`
  And no story or flow is created
  And nothing is written outside the run's own directory under `.qfai/run/`

# AC-0001-0192-04
# Parent: US-0001-0192
Scenario: The checked plan is announced in the operator's words
  Given a route proposal with typed normative and observed references has been checked into a plan bound to one business flow
  When the first stage is about to start
  Then the operator sees the goal, the stages in order and the write scope
  And no route or stage identifier appears
  And the announcement asks nothing
  And a proposal that fails a check, with an unknown ID or path, a malformed reference, or not exactly one bound flow, is refused and routing stays where it was

# AC-0001-0192-05
# Parent: US-0001-0192
Scenario: The run reaches finish with no stage typed by the operator
  Given the operator typed one free-text feature request
  When the run proceeds through its plan
  Then `qfai-run` fetches and submits every work order itself
  And the operator types no stage name after the first prompt

# AC-0001-0192-06
# Parent: US-0001-0192
Scenario: finish decides the final gates itself
  Given the last stage of the run is accepted
  When `finish` runs
  Then validate is run in process and its result decides the validate gate
  And only this run's verify report and an independent `qa-gatekeeper` PASS satisfy the other gates

# AC-0001-0192-07
# Parent: US-0001-0192
Scenario: A working-tree result is never reported as done
  Given the operator said not to commit
  When `finish` judges the run
  Then the result is reported as `working_tree`, never as `qfai_done`
  And the QFAI delivery conditions still unmet are listed

# AC-0001-0192-08
# Parent: US-0001-0192
Scenario: A missing seam is added before RED, and the main work only after
  Given an acceptance test cannot reach its assertion because a route is missing
  When the acceptance stage asks for the seam
  Then implement receives a seam-only work order
  And control returns to the same acceptance stage instance, which takes RED at the assertion
  And a seam-only result that makes the assertion pass is refused

# AC-0001-0192-09
# Parent: US-0001-0192
Scenario: A resubmitted result changes nothing
  Given a story-authoring result has been accepted and the run has moved on
  When the same result ID is submitted again
  Then the original verdict is returned
  And the stories that stage created, and the rows it appended to `decisions.md`, each exist once

# AC-0001-0192-10
# Parent: US-0001-0192
Scenario: A result outside the scope is refused
  Given a run whose scope names its write areas and goal
  When a result writes outside those areas or creates a story no approved slot authorizes
  Then `accept` refuses it and the run state is unchanged
  And a story the story-authoring stage created for an approved slot is accepted

# AC-0001-0192-11
# Parent: US-0001-0192
Scenario: A run that weakens its own gate does not complete
  Given a run that changed `qfai.config.yaml` inside its write scope
  When `finish` runs
  Then the run does not complete
  And the changed digest is listed as an unmet condition

# AC-0001-0192-12
# Parent: US-0001-0192
Scenario: A stage writes its own records and nothing that approves
  Given a work order bound to one business flow
  When the stage result changes that flow's own stage evidence
  Then `accept` takes the result
  And a result that changes another flow's evidence, the run's tracked evidence, a decision record, a decisions table outside a story-authoring stage, or a story's criteria it was not given as a write area is refused `write-scope`

# AC-0001-0192-13
# Parent: US-0001-0192
Scenario: The announced scope names the tracked files a stage will write
  Given a plan with an `sdd`, `sdd_delta`, `discussion` or UI-bearing `prototype` stage
  When `qfai-run` submits its route proposal
  Then the write scope names each tracked file those stages will write, and only the narrowest set for each stage
  And a proposal naming a decisions table, a decision record or another protected path is refused

# AC-0001-0192-14
# Parent: US-0001-0192
Scenario: qfai_done requires committed tracked run changes
  Given a ready run whose target is `qfai_done`
  When `finish` judges tracked run changes and tracked workflow evidence
  Then any uncommitted file is reported as `uncommitted` and the run stays `ready`
  And completion succeeds only after every such file is committed

# AC-0001-0192-15
# Parent: US-0001-0192
Scenario: Successful finish records completion only at runtime
  Given a ready run meeting its completion target
  When `finish` succeeds
  Then only the runtime journal and snapshot record `completed`
  And the tracked summary keeps its state from its last write
  And `status` reports the current state from the journal

# AC-0001-0192-16
# Parent: US-0001-0192
Scenario: A story-authoring stage only appends rows, and each approved row cites this run's answer
  Given a result of an `sdd`, `sdd_append` or `sdd_delta` stage
  When `accept` compares `decisions.md` and `open-questions.md` with their state at issue
  Then a row present at issue is unchanged, apart from the Status of a row this run appended
  And an appended row naming an approval-required operation, or opening `Change request:`, stands at WIP or DONE only when its Approach cites a `human_decision` this run recorded for it
  And any other result is refused with the run unchanged
```
