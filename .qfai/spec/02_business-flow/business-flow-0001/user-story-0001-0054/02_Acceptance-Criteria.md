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
    And a row the base holds whose Content or Approach cell changed authorises nothing
    And a `03_Example.md` whose only change is appended example rows, and a contract whose only change is EX IDs added to the Examples cell of its rules, need no such row

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

  # AC-0001-0054-08
  Scenario: An example rewritten with no test change is reported
    Given the story tree, a base that holds `decisions.md`, and an EX row of a `03_Example.md` whose text changed since the base
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
    Then a warning names the EX ID and its `03_Example.md` unless a non-E2E test file selected by the configured test globs and annotating that EX also changed since the base
    And an EX row whose cells are unchanged raises no such warning

  # AC-0001-0054-10
  Scenario: A base that cannot be compared with is reported, and the base that was used is named
    Given the story tree in a git repository
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs and `baseBranch` has no merge base with HEAD
    Then one warning names `baseBranch` and the way to make it resolve, instead of the run passing as if nothing changed
    And when the base resolves, `qfai validate --profile drift` reports at info the merge base commit and the number of changed files it compared, saying so when HEAD is that commit

  # AC-0001-0054-11
  Scenario: An edit that is not committed is said not to be compared
    Given the story tree, and a protected file edited or added in the working tree and not committed, that no in-force change request names
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
    Then one warning names the uncommitted protected paths, the first five, and counts the rest, and says they are not compared with the base
    And once the change is committed the upstream-edit error of AC-0001-0054-03 applies to it, and the warning is gone
    And an edit to `decisions.md` confined to `Change request:` rows, a file a change request names, an append-only `03_Example.md`, a contract that only gains EX IDs in its Examples cell and a file outside the protected set raise no such warning
```
