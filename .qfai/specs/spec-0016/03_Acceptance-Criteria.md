# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

---

### US-0016-0001: Sub-agent Roster Formalization

```gherkin
# AC-0016-0001
Scenario: Six named sub-agents defined in SKILL.md
  Given SKILL.md for qfai-implement is the canonical skill file
  When the sub-agent roster section is inspected
  Then exactly 6 sub-agents are named: TDDCycleController, TDDImplementer, RedGreenAuditor, TDDSpecReviewer, TDDCodeQualityReviewer, ParallelSliceDispatcher
  And each sub-agent has an explicit responsibility scope
  And each sub-agent has explicit prohibitions listed
```

```gherkin
# AC-0016-0002
Scenario: Handoff contracts between sub-agents are defined
  Given SKILL.md defines the sub-agent roster
  When the handoff contract section is inspected
  Then TDDCycleController → TDDImplementer handoff is defined
  And TDDImplementer → RedGreenAuditor handoff is defined for both RED and GREEN observations
  And RedGreenAuditor → TDDImplementer confirmation protocol is defined
  And TDDImplementer → TDDSpecReviewer request protocol is defined
  And TDDImplementer → TDDCodeQualityReviewer request protocol is defined
  And TDDCycleController → ParallelSliceDispatcher dispatch protocol is defined
```

```gherkin
# AC-0016-0003
Scenario: TDDImplementer cannot self-certify RED or GREEN observations
  Given TDDImplementer has completed writing a failing test
  When TDDImplementer attempts to advance to GREEN without RedGreenAuditor confirmation
  Then the attempt is blocked
  And the error states that only RedGreenAuditor can confirm RED and GREEN observations
```

```gherkin
# AC-0016-0004
Scenario: RedGreenAuditor enforces watch-it-fail before implementation
  Given TDDImplementer has written a test but not yet observed it fail
  When TDDImplementer submits a RED observation without a failing test result
  Then RedGreenAuditor rejects the observation
  And the item cannot advance to the GREEN phase
```

```gherkin
# AC-0016-0005
Scenario: RedGreenAuditor accepts valid resubmission after rejection
  Given RedGreenAuditor rejected a RED observation due to missing test result
  When developer re-runs the test and resubmits with a valid failing result
  Then RedGreenAuditor accepts the resubmission
  And the item advances to the implementation phase
```

```gherkin
# AC-0016-0006
Scenario: Each sub-agent has exactly one responsibility scope
  Given SKILL.md defines the sub-agent roster
  When the responsibility sections are inspected
  Then no two sub-agents share the same primary responsibility
  And each sub-agent's scope is non-overlapping with other agents' scopes
```

---

### US-0016-0002: Completion Contract Hardening

```gherkin
# AC-0016-0007
Scenario: 10-point item completion checklist is defined
  Given SKILL.md defines the item completion contract
  When the checklist is inspected
  Then the following 10 items are present in order:
    1. TDD-ID selected from test-list.md
    2. Failing test written
    3. RED observed (test fails)
    4. Minimal implementation code written
    5. GREEN observed (test passes)
    6. Refactor performed and GREEN verified
    7. TDDSpecReviewer review PASS
    8. TDDCodeQualityReviewer review PASS
    9. test-list.md updated to done
    10. Checkpoint passed
```

```gherkin
# AC-0016-0008
Scenario: Item completion blocked without TDDSpecReviewer sign-off
  Given an item has completed RED, GREEN, and refactor phases
  When completion is attempted without TDDSpecReviewer sign-off
  Then completion is blocked
  And the error states that spec review is required before marking the item done
```

```gherkin
# AC-0016-0009
Scenario: Item completion blocked without TDDCodeQualityReviewer sign-off
  Given an item has completed RED, GREEN, refactor, and spec review phases
  When completion is attempted without TDDCodeQualityReviewer sign-off
  Then completion is blocked
  And the error states that quality review is required before marking the item done
```

```gherkin
# AC-0016-0010
Scenario: Item completion blocked without RED evidence
  Given an item has no RED phase evidence recorded
  When completion is attempted
  Then completion is blocked
  And the error states that RED evidence (command+result) is required
```

```gherkin
# AC-0016-0011
Scenario: Item completion blocked without GREEN evidence
  Given an item has RED evidence but no GREEN phase evidence recorded
  When completion is attempted
  Then completion is blocked
  And the error states that GREEN evidence (command+result) is required
```

```gherkin
# AC-0016-0012
Scenario: Spec-level completion conditions are defined
  Given SKILL.md defines the spec completion contract
  When the spec completion conditions are inspected
  Then the following conditions are present:
    - All unit and component TCs are mapped
    - All items are done or exception
    - DR-ID is present for every exception item
    - 0 blocking issues remain
    - Checkpoint passes
```

```gherkin
# AC-0016-0013
Scenario: Spec completion blocked with items remaining
  Given a spec has 3 items, 2 done and 1 still in progress
  When spec-level completion is attempted
  Then spec completion is blocked
  And the error states that all items must be done or exception
```

```gherkin
# AC-0016-0014
Scenario: Reviewer rejects item; item can be re-approved after fix
  Given TDDSpecReviewer has rejected an item with a FAIL result
  When the developer fixes the issue and resubmits to TDDSpecReviewer
  Then the item re-enters the review state
  And can be marked done after the reviewer issues a PASS
```

```gherkin
# AC-0016-0015
Scenario: Reviewer approval is idempotent
  Given TDDSpecReviewer has already approved an item
  When TDDSpecReviewer approves the same item again
  Then there is no state change
  And the item remains in its current done state
```

```gherkin
# AC-0016-0016
Scenario: TDDImplementer cannot approve its own code quality
  Given TDDImplementer has completed implementation
  When TDDImplementer attempts to self-certify code quality
  Then the attempt is blocked
  And the error states that TDDCodeQualityReviewer must perform code quality review independently
```

---

### US-0016-0003: Evidence Contract Hardening

```gherkin
# AC-0016-0017
Scenario: Evidence minimum contract fields are defined
  Given SKILL.md defines the evidence contract
  When the evidence minimum section is inspected
  Then the following fields are required for each TDD item:
    - TDD-ID
    - TC-ref
    - RED command (the exact command run)
    - RED result (the output showing test failure)
    - GREEN command (the exact command run)
    - GREEN result (the output showing test pass)
    - Refactor verify result
    - TDDSpecReviewer result
    - TDDCodeQualityReviewer result
```

```gherkin
# AC-0016-0018
Scenario: Evidence with command+result pair is accepted
  Given an evidence entry contains a RED command "npm test -- foo.test.ts" and its failing output
  When RedGreenAuditor validates the evidence
  Then the evidence is accepted as meeting the minimum contract
```

```gherkin
# AC-0016-0019
Scenario: Status-only evidence is rejected
  Given an evidence entry contains only "PASS" without the command that produced it
  When RedGreenAuditor validates the evidence
  Then the evidence is rejected
  And the error states that a command+result pair is required
```

```gherkin
# AC-0016-0020
Scenario: Empty evidence entry is rejected
  Given an evidence entry is completely empty
  When RedGreenAuditor validates the evidence
  Then the evidence is rejected
  And the error states that minimum evidence per TDD item is not met
```

```gherkin
# AC-0016-0021
Scenario: Evidence with command but truncated result is accepted
  Given an evidence entry contains a command and a partial result output
  When RedGreenAuditor validates the evidence
  Then the evidence is accepted
  And a note states that result completeness is best-effort
```

```gherkin
# AC-0016-0022
Scenario: Thin evidence can be replaced with full evidence
  Given an evidence entry was previously rejected as thin
  When the developer replaces the entry with a full command+result pair
  Then the item can proceed after the updated evidence meets minimum contract
```

---

### US-0016-0004: Parallel Dispatch Rules

```gherkin
# AC-0016-0023
Scenario: Independent slices are dispatched in separate worktrees
  Given two slices operate on completely different SUT files, test files, and state
  When TDDCycleController requests parallel dispatch via ParallelSliceDispatcher
  Then ParallelSliceDispatcher validates slice independence
  And both slices are dispatched in separate worktrees
  And integration verify is run after both slices complete and merge
```

```gherkin
# AC-0016-0024
Scenario: Dependent slices are blocked from parallel dispatch
  Given two slices share a dependency file
  When TDDCycleController requests parallel dispatch via ParallelSliceDispatcher
  Then ParallelSliceDispatcher blocks the dispatch
  And the error states that slices must be independent (no shared SUT, test files, or state)
```

```gherkin
# AC-0016-0025
Scenario: Parallel dispatch in same worktree is blocked
  Given a parallel dispatch request without worktree separation
  When ParallelSliceDispatcher evaluates the request
  Then the dispatch is blocked
  And the error states that worktree separation is required for parallel execution
```

```gherkin
# AC-0016-0026
Scenario: Single slice submitted for parallel dispatch degenerates to sequential
  Given only one slice is submitted for parallel dispatch
  When ParallelSliceDispatcher processes the request
  Then the request is allowed
  And execution degenerates to sequential processing of the single slice
```

```gherkin
# AC-0016-0027
Scenario: Integration verify failure rolls back parallel merge
  Given two independent slices completed parallel execution and merged
  When integration verify is run and fails
  Then all slices must be re-examined
  And the merge is rolled back
```

```gherkin
# AC-0016-0028
Scenario: TDDImplementer cannot bypass ParallelSliceDispatcher
  Given TDDImplementer wants to run parallel work
  When TDDImplementer attempts parallel execution without routing through ParallelSliceDispatcher
  Then the attempt is blocked
  And only ParallelSliceDispatcher can authorize parallel dispatch
```

---

### US-0016-0005: Docs/Wrappers/Assets Test Synchronization

```gherkin
# AC-0016-0029
Scenario: All artifacts contain 8 required phrases
  Given SKILL.md, README.md, workflow.md, and platform wrappers are present
  When asset tests run the required phrase check
  Then all 8 required phrases are found across the relevant artifacts
  And the asset tests pass
```

```gherkin
# AC-0016-0030
Scenario: Forbidden phrase in wrapper causes asset test failure
  Given a wrapper file contains a phrase from the forbidden list (e.g., stale v1.6.0 wording)
  When asset tests run the forbidden phrase check
  Then the asset test fails
  And the specific forbidden phrase and file location are reported
```

```gherkin
# AC-0016-0031
Scenario: Documentation missing a required phrase causes asset test failure
  Given documentation is missing a required phrase (e.g., sub-agent roster reference)
  When asset tests run the required phrase check
  Then the asset test fails
  And the specific missing required phrase and expected file are reported
```

```gherkin
# AC-0016-0032
Scenario: Wrapper descriptions use behavior-only language
  Given platform wrappers (.agents/.claude/.codex) are inspected
  When wrapper description content is checked
  Then wrapper descriptions describe behaviors (watch-it-fail/pass, reviewer gates)
  And wrapper descriptions do not expose internal sub-agent names
```

```gherkin
# AC-0016-0033
Scenario: Developer corrects missing required phrase and tests pass
  Given asset tests failed because a required phrase was missing from documentation
  When the developer adds the missing required phrase and re-runs asset tests
  Then asset tests pass
```

```gherkin
# AC-0016-0034
Scenario: Asset tests are idempotent
  Given all artifacts contain required phrases and no forbidden phrases
  When asset tests are run twice with the same input
  Then both runs produce the same passing result
```

```gherkin
# AC-0016-0035
Scenario: verify-pack passes with all v1.6.2 changes
  Given all SKILL.md, wrapper, documentation, and test file updates are applied
  When verify-pack.mjs is run
  Then all files pass packaging integrity check
  And verify-pack exits with success
```

---

## AC Catalog

| ID           | Title                                               | US-Ref       | Priority |
| ------------ | --------------------------------------------------- | ------------ | -------- |
| AC-0016-0001 | Six named sub-agents defined in SKILL.md            | US-0016-0001 | P1       |
| AC-0016-0002 | Handoff contracts between sub-agents defined        | US-0016-0001 | P1       |
| AC-0016-0003 | TDDImplementer cannot self-certify observations     | US-0016-0001 | P1       |
| AC-0016-0004 | RedGreenAuditor enforces watch-it-fail              | US-0016-0001 | P1       |
| AC-0016-0005 | RedGreenAuditor accepts valid resubmission          | US-0016-0001 | P2       |
| AC-0016-0006 | Each sub-agent has exactly one responsibility scope | US-0016-0001 | P1       |
| AC-0016-0007 | 10-point item completion checklist defined          | US-0016-0002 | P1       |
| AC-0016-0008 | Item completion blocked without spec review         | US-0016-0002 | P1       |
| AC-0016-0009 | Item completion blocked without quality review      | US-0016-0002 | P1       |
| AC-0016-0010 | Item completion blocked without RED evidence        | US-0016-0002 | P1       |
| AC-0016-0011 | Item completion blocked without GREEN evidence      | US-0016-0002 | P1       |
| AC-0016-0012 | Spec-level completion conditions defined            | US-0016-0002 | P1       |
| AC-0016-0013 | Spec completion blocked with items remaining        | US-0016-0002 | P1       |
| AC-0016-0014 | Reviewer rejection allows re-approval after fix     | US-0016-0002 | P2       |
| AC-0016-0015 | Reviewer approval is idempotent                     | US-0016-0002 | P2       |
| AC-0016-0016 | TDDImplementer cannot self-approve code quality     | US-0016-0002 | P1       |
| AC-0016-0017 | Evidence minimum contract fields defined            | US-0016-0003 | P1       |
| AC-0016-0018 | Evidence with command+result pair is accepted       | US-0016-0003 | P1       |
| AC-0016-0019 | Status-only evidence is rejected                    | US-0016-0003 | P1       |
| AC-0016-0020 | Empty evidence entry is rejected                    | US-0016-0003 | P1       |
| AC-0016-0021 | Evidence with truncated result is accepted          | US-0016-0003 | P2       |
| AC-0016-0022 | Thin evidence can be replaced with full evidence    | US-0016-0003 | P2       |
| AC-0016-0023 | Independent slices dispatched in separate worktrees | US-0016-0004 | P1       |
| AC-0016-0024 | Dependent slices blocked from parallel dispatch     | US-0016-0004 | P1       |
| AC-0016-0025 | Parallel dispatch in same worktree blocked          | US-0016-0004 | P1       |
| AC-0016-0026 | Single slice degenerates to sequential              | US-0016-0004 | P2       |
| AC-0016-0027 | Integration verify failure rolls back merge         | US-0016-0004 | P1       |
| AC-0016-0028 | TDDImplementer cannot bypass ParallelSliceDispatcher | US-0016-0004 | P1      |
| AC-0016-0029 | All artifacts contain 8 required phrases            | US-0016-0005 | P1       |
| AC-0016-0030 | Forbidden phrase in wrapper causes test failure     | US-0016-0005 | P1       |
| AC-0016-0031 | Missing required phrase causes test failure         | US-0016-0005 | P1       |
| AC-0016-0032 | Wrapper descriptions use behavior-only language     | US-0016-0005 | P1       |
| AC-0016-0033 | Correcting missing phrase makes tests pass          | US-0016-0005 | P2       |
| AC-0016-0034 | Asset tests are idempotent                          | US-0016-0005 | P2       |
| AC-0016-0035 | verify-pack passes with all v1.6.2 changes          | US-0016-0005 | P1       |
