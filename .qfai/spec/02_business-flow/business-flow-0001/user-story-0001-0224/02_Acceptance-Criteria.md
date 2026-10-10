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

  # AC-0001-0224-07
  Scenario: A goal keeps independent targets on separate plans
    Given a goal whose targets have settled independent scopes
    When the session takes an eligible target
    Then it extracts and plans that target separately with the existing planner
    And it keeps each target's chosen scope and ordered stages and steps
    And an unmet dependency is not treated as independence, and unresolved mixed findings still take the existing bundle or decomposition route
    And a newly eligible target within the goal's selection criteria is planned separately; a finding outside a target's scope is not inserted into its route

  # AC-0001-0224-08
  Scenario: The shared checkout changes only when its users and files are safe
    Given one target waiting for CI or review and another authorized independent target
    When the orchestrator changes the checkout to continue the other target
    Then every shared-checkout writer and locally executing gate has finished, target edits are preserved by a permitted path-limited commit, and the whole index and worktree are clean
    And unknown or unrelated dirty files postpone the switch without stashing, resetting or deleting them
    And a review still using live checkout files or local execution prevents the switch until it returns
    And a read-only reviewer bound to a fixed commit and using only `git show <fixed SHA>:<path>` may continue while the orchestrator switches a clean checkout
    And a read-only child never switches the shared checkout itself
    And a CI-only pending gate uses the existing DELEGATED commit allowance only under explicit user instruction or project policy

  # AC-0001-0224-09
  Scenario: A paused target resumes with its own head and evidence
    Given a target paused for a named CI check, review result or required answer
    When evidence arrives or the target is resumed
    Then the existing stage reports or handoff messages identify its plan and scope, stage and step, branch and exact head, evidence, open approval or blocker, and resume condition
    And the session checks that target and head before using the evidence or writing
    And stale or wrong-head CI evidence cannot pass the current head, and pending CI does not complete verification
    And a red check for the correct target and head resumes its existing planned gate and fix procedure without adding or skipping stages or reviews
    And review evidence remains bound to the commit reviewed, and a head change never relabels an earlier verdict as a new-head review

  # AC-0001-0224-10
  Scenario: Authorization is applied to the target it covers
    Given a goal delegating ordinary choices or asking that no questions be put
    When a target reaches a choice, critical decision or release point
    Then ordinary choices and external actions proceed only when prior user instruction or project policy actually covers them
    And the report names an agent-selected choice under that authorization without attributing an individual option selection to the user
    And no-question wording alone supplies no missing approval
    And an uncovered critical decision or release approval stays open and stops dependent work on that target under the existing question or no-question rules
    And other authorized independent targets may continue, while a goal-wide stop stops all targets
```
