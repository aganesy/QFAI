# Acceptance Criteria

## Criteria

```gherkin
Feature: Append-only decision and question registers
  # AC-0001-0054-01
  Scenario: A removed or renumbered decision row, or an edited question row, is reported
    Given the story tree, a base `qfai validate` can resolve, and the complete decision register and `open-questions.md` the base holds
    When a decision row the base holds is removed or its ID changes, or a question row the base holds is edited, and `qfai validate --profile drift` runs
    Then an error names the file, the row ID and, for a question row, the changed cell
    And a decision row whose Content or Approach is restated under the same ID raises no such error
    And rows are matched by ID, so a base row the head keeps unchanged at another place, and a row the head adds anywhere, raise no such error
    And a question row the base holds may be deleted when any decision row or question row of the head register names its ID, and a deleted question that no such row names is reported
    And a question row the head holds that the base lacks, while a decision row of the base register names its ID, is reported as a settled question brought back

  # AC-0001-0054-02
  Scenario: An unresolvable base turns every story-tree drift check off
    Given the story tree, and a base git cannot resolve, because the base ref is missing or the project is not a git repository
    When `qfai validate --profile drift` runs
    Then no story-tree drift check reports anything, the row-rewritten, example, branch-added-ID and question checks included

  # AC-0001-0054-05
  Scenario: A base without decisions.md turns every story-tree drift check off
    Given the story tree, and a merge base of `baseBranch` and HEAD that holds no `decisions.md` at the configured `paths.specsDir`
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
    Then no story-tree drift check reports anything, the row-rewritten, example, branch-added-ID and question checks included

  # AC-0001-0054-08
  Scenario: An example rewritten with no test change is reported
    Given the story tree, a base that holds `decisions.md`, and an EX row of a `03_Example.md` whose text changed since the base
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
    Then a warning names the EX ID and its `03_Example.md` unless a non-E2E test file selected by the configured test globs and annotating that EX also changed since the base
    And an EX row whose cells are unchanged raises no such warning
  # AC-0001-0054-09
  Scenario: Drift compares the complete head and base registers
    Given head and base decision registers whose pages may differ
    When the row checks run
    Then both complete registers are read, the pages in the root's list order and then the root, before any row is compared
    And rows are matched by ID, so neither the file nor the place a row sits in makes it new
    And an unsafe, missing, malformed or unreadable head or base page reports an error and never silently disables drift
    And the existing no-Git, unresolvable-base and base-without-root rules remain limited to those conditions

  # AC-0001-0054-10
  Scenario: A base that cannot be compared with is reported, and the base that was used is named
    Given the story tree in a git repository
    When `qfai validate --profile tdd` or `qfai validate --profile drift` runs and `baseBranch` has no merge base with HEAD
    Then one warning names `baseBranch` and the way to make it resolve, instead of the run passing as if nothing changed
    And when the base resolves, `qfai validate --profile drift` reports at info the merge base commit and the number of changed files it compared, saying so when HEAD is that commit

  # AC-0001-0054-12
  Scenario: A row the branch adds takes the timestamp form
    Given the story tree, and a base that holds `decisions.md`
    When the branch adds a row to the decision register or to `open-questions.md`, and `qfai validate --profile drift` runs
    Then a row the branch adds with a four-digit ID raises an error naming the file and the row ID
    And a row in the `DEC-yyyymmddhhMMss` or `OQ-yyyymmddhhMMss` form, and every four-digit row the base holds, raise none
```
