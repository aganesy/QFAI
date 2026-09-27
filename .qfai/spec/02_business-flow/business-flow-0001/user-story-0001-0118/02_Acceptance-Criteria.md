# Acceptance Criteria

## Criteria

```gherkin
Feature: Project-wide UI-contract resolution
  # AC-0001-0118-01
  Scenario: A contract without an ID or screens is not UI-bearing
    Given a story-tree project contains non-UI work and a UI contract file without a `CON-UI-NNNN` ID or a `screens[]` entry
    When prototyping scope is resolved
    Then the file is excluded from the UI-bearing contract set and no spec-level marker is read
    And missing screen contracts do not trigger UI-only requirements for the non-UI work

  # AC-0001-0118-02
  Scenario: One invocation resolves every UI-bearing UI contract
    Given a consumer project whose `<paths.contractsDir>/ui/` holds one or more files that each declare a `CON-UI-NNNN` ID and at least one `screens[]` entry
    When `/qfai-prototyping` is invoked exactly once
    Then the resolver returns every UI-bearing `CON-UI-NNNN` ID, no primary-contract selection prompt is emitted, and cycle-0 evidence records the resolved set in `uiContractsCovered[]`
    And nothing read from `01_Spec.md` or from a contract file named after a spec counts toward the set

  # AC-0001-0118-03
  Scenario: No UI-bearing contract at cycle 0 is a no-op
    Given a consumer project with zero UI-bearing UI contracts at cycle 0 (no in-progress `prototyping.json#frozenSurfaceUnion` recorded yet)
    When `/qfai-prototyping` is invoked at cycle 0
    Then the run exits 0 deterministically as a no-op (not an error)
    And at cycle 1 or later, zero UI-bearing UI contracts is a hard-stop drift class (see AC-0001-0122-02 class (d) for the "UI markers removed mid-loop" path and class (e) for the "missing cycle-0 seed" path), not a no-op
```
