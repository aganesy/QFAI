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
    Then it writes the artifact itself, or gives each unit that passes the parallel-unit gate to a sub-agent to run in parallel
    And a review is done by an agent that did not author what it reviews
    And on Codex a sub-agent costs one self-contained brief and one final answer, with no polling between them

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
    When the session agent changes the checkout to continue the other target
    Then every shared-checkout writer and locally executing gate has finished, target edits are preserved by a permitted path-limited commit, and the whole index and worktree are clean
    And unknown or unrelated dirty files postpone the switch without stashing, resetting or deleting them
    And a review still using live checkout files or local execution prevents the switch until it returns
    And a read-only reviewer bound to a fixed commit and using only `git show <fixed SHA>:<path>` may continue while the session agent switches a clean checkout
    And a read-only child never switches the shared checkout itself
    And a CI-only pending gate uses the existing DELEGATED commit allowance only under explicit user instruction or project policy

  # AC-0001-0224-09
  Scenario: A paused target resumes with its own head and evidence
    Given a target paused for a named CI check, review result or required answer
    When evidence arrives or the target is resumed
    Then the existing stage reports or handoff messages identify its plan and scope, stage and step, branch and exact head, evidence, open approval or blocker, and resume condition
    And a CI receipt names that current head, the check and run ID or URL, observed results and executed case counts for test checks, marking unavailable evidence as unverified
    And the session checks that target and head before using the evidence or writing
    And each CI receipt names the workflow run ID, event, confirmed action or purpose, and run attempt for the target and full head SHA
    And job IDs and check IDs are identified separately where present, with workflow or log evidence of actual execution and results, including actual executed cases and counts for test checks
    And lint and build checks require evidence of their actual execution and results, without invented case counts
    And missing required identity, ambiguous job or check IDs, unknown purpose or missing execution evidence stays unverified
    And a skipped result is not behavioral PASS, and an identified later cleanup skip for the same head and check name does not replace an identified successful verification run
    And an older success cannot hide a later failed attempt of the same required verification
    And missing, stale or wrong-head CI evidence cannot pass the current head, and pending CI does not complete verification or justify a merge
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

  # AC-0001-0224-11
  Scenario: Requested evidence is received before a session is archived
    Given a request that requires evidence handover before session archive
    When the session prepares the required evidence
    Then it selects explicit regular files and writes an ignored human index with source, selected byte identity, observed execution facts, original outcomes, exclusions and unresolved work
    And unknown historical execution facts cannot prove verification, while unknown required selected-file or independent source/archive identity stops delivery
    And the governing guide's single native fs/crypto preflight checks safe source and staged paths, regular entries, uniqueness, expected sizes and digests; CI executes the same published block
    And missing, linked, hardlinked, non-regular, unsafe, duplicate, case-colliding or changed selected items stop production before native archive
    And reviewed or redacted copies are distinguished from originals, delivered bytes are hashed, and secrets or unapproved private data are excluded without an automatic privacy guarantee
    And standard native tools preserve every selected byte, and the required archive member set and extracted sizes and digests are checked without text normalization
    And retained destination authority, access and retention are established for the named recipient or receiving role
    And that independent recipient retrieves every required item and checks archive/source identity against trusted input outside the bundle before extracting a known-safe archive into a fresh directory
    And the ignored receipt names the recipient, retrieval time, destination and artifact identity, retrieved items, source/digest checks and missing evidence
    And missing, stale, tampered, expired, denied or unavailable delivery records its blocker and resume condition, retains originals and does not complete the handover or allow archive
    And prior-source PASS, current FAIL, UNRUN, delegated pending, review identity and excluded attempts keep their original meaning, and required verification failure or nonexecution is not completed
    And generic capability acceptance requires native Linux and Windows producers and separate Linux and Windows receivers checking both actual retained producer artifacts, without inventing a real successor receipt
    And ordinary completion causes no unsolicited upload, existing verification and routing contracts remain unchanged, and no new exporter, schema, state engine or atomic filesystem guarantee is claimed

  # AC-0001-0224-12
  Scenario: Reached scoped steps have assessable observations
    Given a target following its selected plan scope before a declared stop or termination
    When the session reaches the existing boundary of a stage
    Then its existing stage report compares the finite set of reached steps with their actual observations and evidence
    And each entry identifies the plan step, owner, purpose, target and source identity, actual input reads, action or output, and artifact references
    And applicable Gate observations identify the actual command, purpose, status and observed result, with available exit outcomes and executed case counts for test commands without invented non-test counts
    And a no-write pass names the actual Passes when inputs and declared reason; writing nothing does not mean the step did not run
    And scope exclusions and declared termination leave legitimate unreached work outside the comparison, preserving plan order, stops and pass-through
    And missing, stale, ambiguous or wrong-purpose proof leaves completion UNVERIFIED, distinct from an omission established by actual evidence
    And plans, declarations, content-read receipts and unrelated green commands cannot establish the required procedural action, understanding or adherence
    And the session checks target and source identity and inspects existing receipts before obtaining missing proof or resuming only genuinely owed authorized work, without blindly repeating irreversible or external actions
    And the already-planned independent review assesses the available comparison for the work it reviews without adding a review or gate
    And actual FAIL, UNRUN and pending results remain visible, required gates still apply, and no engine, command, plan key, runtime schema or report registry is introduced

  # AC-0001-0224-13
  Scenario: An authorized procedure has its own documentation writer
    Given a request to author an ordinary operational Markdown procedure within existing policy
    When the session extracts and plans the request
    Then it uses intent procedure and the actual docs deliverable without inventing code, tests, specification or contract artifacts
    And rule 29 selects write-procedure after refactor and before docs, while rules 1 through 28 retain priority
    And the plan runs implement-procedure in a documentation stage, followed by the existing change-note code review and QFAI, repository and commit verification
    And every step keeps the existing four output keys and applicable checks; no release point, branch point or extra review is added
    And qfai-implement owns the route-only step; ordinary named business-flow implementation and wording-only maintenance keep their existing procedures
    And the writer changes only authorized procedure documents within existing policy, stopping before protected-owner edits or invented required facts
    And a script the procedure names for the operator to run is edited only as far as the procedure change requires, keeping its existing tests and checks passing
    And writing the procedure grants no permission to execute its actions or expand external authority
    And a mixed request retains its actual artifacts and existing checks rather than hiding implementation in a docs-only reading
    And unavailable required checks remain UNRUN; unobserved procedure execution is not reported as completed
```
