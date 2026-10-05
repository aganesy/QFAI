# Acceptance Criteria

## Criteria

```gherkin
Feature: Project-wide UI-contract resolution
  # AC-0001-0114-01
  Scenario: A contract without an ID or screens is not UI-bearing
    Given a story-tree project contains non-UI work and a UI contract file without a `UI-NNNN` ID or a `screens[]` entry
    When prototyping scope is resolved
    Then the file is excluded from the UI-bearing contract set and no spec-level marker is read
    And missing screen contracts do not trigger UI-only requirements for the non-UI work

  # AC-0001-0114-02
  Scenario: One invocation resolves every UI-bearing UI contract
    Given a consumer project whose `<paths.contractsDir>/ui/` holds one or more files that each declare a `UI-NNNN` ID and at least one `screens[]` entry
    When `/qfai-prototyping` is invoked exactly once
    Then the resolver returns every UI-bearing `UI-NNNN` ID, and no primary-contract selection prompt is emitted
    And nothing read from `01_Spec.md` or from a contract file named after a spec counts toward the set

  # AC-0001-0114-03
  Scenario: No UI-bearing contract writes nothing
    Given a consumer project with no UI-bearing UI contract
    When `/qfai-prototyping` is invoked
    Then it writes nothing and says no UI-bearing contract was resolved
```
