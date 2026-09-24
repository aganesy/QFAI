# 03 Acceptance Criteria

## AC-0011-0001: TDD Cycle Completeness

Given a `todo` item in test-list.md, when `/qfai-implement` processes it, then it transitions through `red` -> `green` -> `refactor` -> `done` with evidence at each phase.

## AC-0011-0002: Backward Transition Rejection

Given an item with status `green`, when a transition to `red` is attempted, then the system produces error: "Backward transition prohibited: green -> red".

## AC-0011-0003: QA Gatekeeper Sole Authority

Given a RED observation by an implementation worker, when confirmation is needed, then only qa-gatekeeper may confirm the observation; self-certification is rejected.

## AC-0011-0004: Exception Requires DR-ID

Given an item transitioning to `exception`, when DR-ID column is empty, then error: "exception status requires DR-ID in DR-ID column".

## AC-0011-0005: Parallel Dispatch Authorization

Given a request for parallel execution, when delivery-planner evaluates, then it authorizes only when all allow conditions are met and no deny conditions exist.

## AC-0011-0006: 10-Point Gate Enforcement

Given a TDD item, when checking for `done` transition, then all 10 checklist points are verified including test-first, RED/GREEN auditor confirmation, both reviewer PASS, and checkpoint verification.

## AC-0011-0007: Fresh Evidence Required

Given a TDD item, when evidence is checked, then both RED and GREEN evidence include exact command + result; status-only evidence is rejected.

## AC-0011-0008: Completed Items Skipped

Given a test-list.md with all items `done`, when `/qfai-implement` runs, then it reports "nothing to do" and exits.

## AC-0011-0009: Simplified Handoff Schema

Given a finalized `prototype-handoff.yaml`, when `/qfai-implement` parses it, then only `finalIterIndex` (number), `finalArtifact` (path), `extractedDesignSystem` (path), and `implementationNotes` (string) fields are read. Legacy fields `mustPreserve`, `mayAdapt`, `mustNotCopy` are absent; their presence triggers a schema warning and is ignored.

## AC-0011-0010: Design System As Deterministic DESIGN.md Mirror

Given `extractedDesignSystem` resolves to `.qfai/contracts/design/design-system.yaml`, when `/qfai-implement` reads token tables, then those tables are byte-equivalent to the parsed token tables of root `DESIGN.md` (color / typography / radius / shadow). The mirror invariant is enforced at validate time by the design contract validators owned by spec-0004.

## AC-0011-0011: Minimal Code In Phase Green

Given a failing test, when Phase Green writes production code for it, then the code written is the least that makes that test pass, and behaviour no test yet demands is not generalized ahead of its own RED.

## AC-0011-0012: The implement stage follows the stage-skill handover

- US-Refs: US-0011-0009

```gherkin
# AC-0011-0012
# Source: discussion-20260923171450572#REQ-0051
Scenario: The implement stage follows the stage-skill handover
  Given workflow mode active
  When /qfai-implement is selected with no work order and not by name
  Then it edits nothing and passes the request to qfai-run
  And a worker handed a work order checks the run, stage and work-order IDs and does only that work
  And SKILL.md cites references/orchestrated-mode.md with one line
```

## AC-0011-0013: The Operations table lists what the plan vocabulary assigns to qfai-implement

- US-Refs: US-0011-0009

```gherkin
# AC-0011-0013
# Source: discussion-20260923171450572#REQ-0052
Scenario: The Operations table lists what the plan vocabulary assigns to qfai-implement
  Given the qfai-implement reference references/orchestrated-mode.md
  When its Operations table is read
  Then it lists exactly the operations the plan vocabulary assigns to qfai-implement, seam-only included
```

## AC-0011-0014: A valid run binding supplies the primary spec without asking

- US-Refs: US-0011-0009

```gherkin
# AC-0011-0014
# Source: discussion-20260923171450572#REQ-0013
Scenario: A valid run binding supplies the primary spec without asking
  Given an implement work order whose target binds a spec
  When the stage starts
  Then that spec is the primary spec and the User Selection Flow asks nothing
  And with no work order the User Selection Flow asks the user to confirm the spec, as it does today
```

## AC-0011-0015: A long stage resumes at a ledger-row boundary

- US-Refs: US-0011-0009

```gherkin
# AC-0011-0015
# Source: discussion-20260923171450572#REQ-0034
Scenario: A long stage resumes at a ledger-row boundary
  Given an implement work order carrying a checkpoint reference and a legal operation
  When the stage resumes
  Then it starts at the ledger row the checkpoint names
  And its result names ledger row IDs and never copies a row's status
  And the skill's own phase order is unchanged
```

## AC-0011-0016: The ledger check is never served from the shared snapshot

- US-Refs: US-0011-0009

```gherkin
# AC-0011-0016
# Source: discussion-20260923171450572#REQ-0056
Scenario: The ledger check is never served from the shared snapshot
  Given an active run whose shared preflight snapshot is valid
  When the implement stage starts
  Then it may reuse the snapshot for the inputs the snapshot covers
  And it reads and checks the bound ledger itself
```

## AC-0011-0017: A seam-only work order lands only the minimal connection

- US-Refs: US-0011-0009

```gherkin
# AC-0011-0017
# Source: discussion-20260923171450572#REQ-0038
Scenario: A seam-only work order lands only the minimal connection
  Given a seam-only work order naming the acceptance test that cannot reach its assertion
  When /qfai-implement serves it
  Then it lands only the minimal connection, through the existing minimal-seam step
  And the target test still fails at its assertion
  And the main implementation waits until the acceptance stage has taken RED
```

## AC-0011-0018: A diagnose-only operation changes no tracked project file

- US-Refs: US-0011-0010

```gherkin
# AC-0011-0018
# Source: discussion-20260923171450572#DAC-002-01
Scenario: A diagnose-only operation changes no tracked project file
  Given a diagnose-only work order with the expected-behaviour reference and the scope
  When /qfai-implement serves it
  Then no file git tracks is changed, so no product code, test or spec file differs
  And a file it writes that git ignores, such as its reproduction record, is named as an artifact, not as a changed file
```

## AC-0011-0019: A diagnosis returns one verdict and what supports it

- US-Refs: US-0011-0010

```gherkin
# AC-0011-0019
# Source: discussion-20260923171450572#DAC-002-01
Scenario: A diagnosis returns one verdict and what supports it
  Given a diagnose-only work order
  When the stage returns
  Then the result carries exactly one verdict: a missing test, a defective test, a regression, or an expectation that differs from the request
  And it names the ledger rows of the matching existing obligations, which the next work order binds
  And the reproduction, the cause candidates and the impact are in the record the result references
```

## AC-0011-0020: A diagnosed missing test raises no Change Request from implement

- US-Refs: US-0011-0010

```gherkin
# AC-0011-0020
# Source: discussion-20260923171450572#REQ-0046
Scenario: A diagnosed missing test raises no Change Request from implement
  Given diagnosis found a missing test on behaviour the spec already states
  When /qfai-implement handles that scope gap
  Then it files no Change Request and adds no ledger row
  And the two scope-gap lines of the skill state that carve-out and cite DR-0297
```

## AC-0011-0021: A regression fix leaves the done row done

- US-Refs: US-0011-0011

```gherkin
# AC-0011-0021
# Source: discussion-20260923171450572#REQ-0046
Scenario: A regression fix leaves the done row done
  Given an existing, correct test on a done ledger row now fails
  When /qfai-implement serves the regression_fix work order
  Then it changes production code only
  And the row's cells are unchanged and its status stays done
  And no Change Request is filed and no evidence is deleted
```

## AC-0011-0022: The same test turning GREEN confirms a regression fix

- US-Refs: US-0011-0011

```gherkin
# AC-0011-0022
# Source: discussion-20260923171450572#REQ-0046
Scenario: The same test turning GREEN confirms a regression fix
  Given a regression fix against a done row
  When the stage returns
  Then the same test has run GREEN again
  And the fix, an independent review and the re-run are in the stage result and the run evidence
  And the re-run is appended to the row's evidence section as a re-verify record
```

## AC-0011-0023: A test fix leaves the ledger row's status alone

- US-Refs: US-0011-0012

```gherkin
# AC-0011-0023
# Source: discussion-20260923171450572#DAC-003-02
Scenario: A test fix leaves the ledger row's status alone
  Given diagnosis found a defective existing test on a row this skill owns
  When /qfai-implement fixes the test in a test_fix stage
  Then the result names the AC or BR the expectation cites before and after the fix
  And it carries an independent review and a re-run of the test
  And the row's status, TC references, layer and boundary are unchanged
  And the re-run is appended to the row's evidence section as a re-verify record
```

## AC-0011-0024: A fix that changes the expectation's meaning goes back to SDD

- US-Refs: US-0011-0012

```gherkin
# AC-0011-0024
# Source: discussion-20260923171450572#DAC-003-03
Scenario: A fix that changes the expectation's meaning goes back to SDD
  Given a test fix after which the expectation would cite a different AC or BR
  When the implement stage returns
  Then the result is needs_repair listing that finding with qfai-sdd as its resolving owner
  And no accepted test fix is returned
```

## AC-0011-0025: Implement takes a test fix only for a unit-layer row

- US-Refs: US-0011-0012

```gherkin
# AC-0011-0025
# Source: discussion-20260923171450572#DAC-003-01
Scenario: Implement takes a test fix only for a unit-layer row
  Given a defective test's ledger row
  When the row's layer is Unit or Component, or Integration with every TC at L1 or L2
  Then /qfai-implement serves the test_fix work order
  And it serves none for an E2E, API or other Integration row
```
