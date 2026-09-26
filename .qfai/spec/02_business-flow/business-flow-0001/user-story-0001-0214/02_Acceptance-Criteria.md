# Acceptance Criteria

## Criteria

```gherkin
Feature: Run /qfai-sdd as a stage of a run

# AC-0001-0214-01
# Parent: US-0001-0214
Scenario: No target never means every flow
  Given an orchestrated /qfai-sdd work order
  When the work order names no target
  Then /qfai-sdd refuses it and does not run the no-argument batch
  And a flow target scopes the stage to that business flow
  And a new_story target makes the result report the binding of the flow and the stories it created

# AC-0001-0214-02
# Parent: US-0001-0214
Scenario: Invoked by name, /qfai-sdd runs standalone
  Given the operator invokes /qfai-sdd by name
  When SDD completes
  Then the skill stops and creates no run
  And a request to go to the end is handed to a whole run

# AC-0001-0214-03
# Parent: US-0001-0214
Scenario: /qfai-sdd checks how it was invoked before it edits anything
  Given /qfai-sdd is selected in active mode
  When it holds no work order and was not invoked by name, or holds one that matches no issued work order
  Then it edits nothing
  And a worker holding a valid work order does only that work
  And the rule is stated in references/orchestrated-mode.md, cited by one SKILL.md line

# AC-0001-0214-04
# Parent: US-0001-0214
Scenario: /qfai-sdd declares the operations it serves
  Given references/orchestrated-mode.md of /qfai-sdd
  When the Operations table is read
  Then it lists exactly the operations the plan vocabulary assigns to qfai-sdd, and no other

# AC-0001-0214-05
# Parent: US-0001-0214
Scenario: Stage 0 reuses the shared snapshot but not SDD's own check
  Given a run whose Stage 0 shared snapshot is recorded
  When /qfai-sdd starts a work order in that run
  Then it reuses the snapshot once its key still matches, and refreshes only what changed
  And the sdd preflight readiness check of the selected source runs again and is never served from the snapshot

# AC-0001-0214-06
# Parent: US-0001-0214
Scenario: An SDD-kind stage changes the tree only on the operator's answer
  Given an sdd, sdd_append or sdd_delta work order
  When the stage has a proposal for the story-tree and contract files it would change
  Then it asks once and changes nothing: it opens one decision question showing the change target and the proposal, with outcome awaiting_input
  And the attempt holding the human_decision makes the change and appends one Change request row naming every protected file it changed, at WIP, with an Approach citing that answer
  And that attempt moves the row to DONE once every change it names is written, leaving it at WIP only while changes remain for a later attempt of the same stage
  And a row citing only request_scope is refused record-unauthorized
```
