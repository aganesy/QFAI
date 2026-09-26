# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0059-01
# Parent: US-0001-0059
Scenario: AC-0001-0059-01
  Given the story tree, and `qfai validate --flow BF-NNNN` naming a flow the tree defines
  When the run completes
  Then it checks that flow, its stories, their ACs and EXs, and the rules that cite those EXs, and leaves out findings about any other flow
  And it writes its result to `validate.flow-<ids>.json` beside the configured `validate.json`, where `<ids>` names every flow in the scope, and leaves `validate.json` and `validate-<profile>.json` untouched

# AC-0001-0059-02
# Parent: US-0001-0059
Scenario: AC-0001-0059-02
  Given the story tree
  When `qfai validate --spec <spec-id>` runs
  Then it exits 2, and its message names `--flow BF-NNNN` as the option that scopes a run on the story tree

# AC-0001-0059-03
# Parent: US-0001-0059
Scenario: AC-0001-0059-03
  Given the story tree
  When `qfai validate --flow <value>` runs with a value that is not a `BF-NNNN` ID, or that names a flow the tree does not define
  Then an error finding names the value, and no `validate.flow-*.json` file is written
```
