# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0056-01
# Parent: US-0001-0056
Scenario: AC-0001-0056-01
  Given the story tree, a base `qfai validate` can resolve, and a row of `decisions.md` or `open-questions.md` that the base holds
  When the row is removed, or its ID, Content or Approach cell changes, and `qfai validate --profile drift` runs
  Then an error names the file, the row ID and the changed cell
  And A change to the Status cell alone raises no such error

# AC-0001-0056-02
# Parent: US-0001-0056
Scenario: AC-0001-0056-02
  Given the story tree, and a base git cannot resolve, because the base ref is missing or the project is not a git repository
  When `qfai validate --profile drift` runs
  Then neither the row-rewritten check nor the upstream-edit check reports anything

# AC-0001-0056-03
# Parent: US-0001-0056
Scenario: AC-0001-0056-03
  Given the story tree, and a protected file changed since the base: a file under `01_policy/` or `02_business-flow/` of `paths.specsDir`, a file under `paths.contractsDir`, `decisions.md` or `open-questions.md`
  When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
  Then an error names the path unless a `decisions.md` row opening `Change request:` names that path with Status WIP or DONE
  And A `Change request:` row at TODO authorises nothing

# AC-0001-0056-04
# Parent: US-0001-0056
Scenario: AC-0001-0056-04
  Given the story tree, and a change to `decisions.md` confined to rows opening `Change request:`: a row appended at any Status, or a Status changed on such a row
  When `qfai validate --profile drift` runs
  Then no upstream-edit error is raised for `decisions.md`

# AC-0001-0056-05
# Parent: US-0001-0056
Scenario: AC-0001-0056-05
  Given the story tree, and a merge base of `baseBranch` and HEAD that holds no `decisions.md` at the configured `paths.specsDir`
  When `qfai validate --profile tdd` or `qfai validate --profile drift` runs
  Then neither the row-rewritten check nor the upstream-edit check reports anything
```
