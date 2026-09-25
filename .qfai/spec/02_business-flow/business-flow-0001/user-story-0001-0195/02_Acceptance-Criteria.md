# Acceptance Criteria

## Criteria

```gherkin
Feature: Stop only for my decision or a fact only I hold

# AC-0001-0195-01
# Parent: US-0001-0195
Scenario: A material risk stops routing for the operator
  Given a request that would lose data, break a public contract, loosen an authorization boundary, send a secret outside, affect production, or drop or add scope
  When routing checks the proposal
  Then the run ends routing in `awaiting_input` with the decision named
  And a bugfix that restores an existing authorization check asks nothing, and its `qfai-implement` and `qfai-atdd` work orders take the `implementation-heavy` review profile

# AC-0001-0195-02
# Parent: US-0001-0195
Scenario: No external effect is implied by the entry
  Given a plan that would push, open a pull request, merge, deploy, migrate production or spend
  When no project policy names that effect
  Then no work order carries the effect
  And a request that names the effect does not change that

# AC-0001-0195-03
# Parent: US-0001-0195
Scenario: The operator's answer decides what the run does next
  Given a question with options, each carrying its effect
  When the operator answers through `decision`
  Then `proceed` continues the run with no stage named by the operator
  And `replan` returns the run to routing
  And `stop` ends the run `cancelled`

# AC-0001-0195-04
# Parent: US-0001-0195
Scenario: A no-question mode never proceeds unapproved
  Given a run under a no-question mode whose plan needs a material decision
  When the decision is reached
  Then the run ends `awaiting_input` or `blocked`
  And no authorization is inferred from the mode

# AC-0001-0195-05
# Parent: US-0001-0195
Scenario: Only what is unsettled is asked
  Given routing is blocked by one missing value
  When the run asks for it
  Then exactly one question is put and the route is fixed afterwards
  And no discussion pack is created
  And a discussion under a run asks nothing its work order lists as settled

# AC-0001-0195-06
# Parent: US-0001-0195
Scenario: An agent cannot approve its own work
  Given an agent-written approval, or an authorization derived from mode or confidence
  When it is submitted through `accept` or `decision`
  Then it is refused
  And no `human_decision` is recorded

# AC-0001-0195-07
# Parent: US-0001-0195
Scenario: The same decision submitted twice is recorded once
  Given a question already answered through `decision`
  When the same answer is submitted again, or a different one
  Then the same answer returns the stored verdict with one `human_decision`
  And a different answer is refused `answer-conflict`

# AC-0001-0195-08
# Parent: US-0001-0195
Scenario: Upstream drift outside the scope halts the run
  Given a stage that finds an upstream item has drifted
  When the stage returns its result
  Then drift inside the run's checked write scope is repaired through a story-authoring work order
  And drift outside it leaves the run `blocked` on `scope-dependency`, with a notice listing every drift finding and the stage to invoke by name
  And the run appends no change-request row for a file outside its scope

# AC-0001-0195-09
# Parent: US-0001-0195
Scenario: A change to the story tree waits for the operator's approval
  Given a story-authoring stage of a run that would change story-tree or contract files
  When it reaches the change
  Then it asks once and changes nothing: one question shows the change target and the proposal
  And the attempt holding the operator's `human_decision` makes the change and appends one `Change request:` row naming those files, already at WIP, citing that answer
  And a row citing only the run's `request_scope` is refused `record-unauthorized`
```
