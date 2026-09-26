# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0054-01
# Parent: US-0001-0054
Scenario: AC-0001-0054-01
  Given the story tree, and a contract file under `paths.contractsDir` that has no row in `contracts.md`
  When `qfai validate --profile sdd` runs
  Then `QFAI-CONTRACT-034` is raised at error naming the file, keyed by the `CON-*` ID the file declares, or by the file's path for a file under `cli/` or `design/` that declares none
  And A contract file that `contracts.md` lists raises no such finding

# AC-0001-0054-02
# Parent: US-0001-0054
Scenario: AC-0001-0054-02
  Given the story tree, and `tech.md` or `structure.md` under `paths.contractsDir` with a section still holding a shipped placeholder, the Standard commands section of `tech.md` included
  When `qfai validate` runs with a profile that runs `QFAI-ASSETS-*`
  Then `QFAI-ASSETS-003` names that file under `paths.contractsDir` and each section still holding a placeholder
  And The catalog copies of `tech.md` and `structure.md` are not read for this finding on the story tree
```
