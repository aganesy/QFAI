# Acceptance Criteria

## Criteria

```gherkin
Feature: Append-only drift and change-request authorization
  # AC-0001-0054-01
  Scenario: A removed or rewritten row is reported
    Given the story tree, a base `qfai validate` can resolve, and a row of `decisions.md` or `open-questions.md` that the base holds
    When the row is removed, or its ID, Content or Approach cell changes, and `qfai validate --profile drift` runs
    Then an error names the file, the row ID and the changed cell
    And a change to the Status cell alone raises no such error

  # AC-0001-0054-02
  Scenario: An unresolvable base turns both drift checks off
    Given the story tree, and a base git cannot resolve, because the base ref is missing or the project is not a git repository
    When `qfai validate --profile drift` runs
    Then neither the row-rewritten check nor the upstream-edit check reports anything

  # AC-0001-0054-03
  Scenario: A protected file changed without a change request is reported
    Given the story tree, and a protected file changed since the base: a file under `01_policy/` or `02_business-flow/` of `paths.specsDir`, a file under `paths.contractsDir`, `decisions.md` or `open-questions.md`
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
    Then an error names the path unless a `decisions.md` row opening `Change request:` names that path with Status WIP or DONE
    And a `Change request:` row at TODO authorises nothing

  # AC-0001-0054-04
  Scenario: Appending or moving a change-request row is not an upstream edit
    Given the story tree, and a change to `decisions.md` confined to rows opening `Change request:`: a row appended at any Status, or a Status changed on such a row
    When `qfai validate --profile drift` runs
    Then no upstream-edit error is raised for `decisions.md`

  # AC-0001-0054-05
  Scenario: A base without decisions.md turns both drift checks off
    Given the story tree, and a merge base of `baseBranch` and HEAD that holds no `decisions.md` at the configured `paths.specsDir`
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
    Then neither the row-rewritten check nor the upstream-edit check reports anything
```
