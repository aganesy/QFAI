# Acceptance Criteria

## Criteria

```gherkin
Feature: Contract index and contract-layer validation
  # AC-0001-0054-01
  Scenario: A contract file missing from contracts.md raises QFAI-CONTRACT-034
    Given the story tree, and a contract file under `paths.contractsDir` that has no row in `contracts.md`
    When `qfai validate --profile sdd` runs
    Then `QFAI-CONTRACT-034` is raised at error naming the file, keyed by the contract ID the file declares, or by the file's path for a file under `cli/` or `design/` that declares none
    And a contract file that `contracts.md` lists raises no such finding

  # AC-0001-0054-02
  Scenario: Placeholders are read from the contract-layer steering files
    Given the story tree, and `tech.md` under `paths.contractsDir` with a section still holding a shipped placeholder, its Standard commands section included
    When `qfai validate` runs with a profile that runs `QFAI-ASSETS-*`
    Then `QFAI-ASSETS-003` names that file under `paths.contractsDir` and each section still holding a placeholder
    And the catalog copy of `tech.md` is not read for this finding on the story tree

  # AC-0001-0054-03
  Scenario: A contract file declares its ID, is named after it and has a matching index row
    Given the story tree, and a `contracts.md` whose index has the columns ID, Title, File, Depends On, Reconciled With and Purpose
    When `qfai validate --profile sdd` runs
    Then `QFAI-CONTRACT-034` is raised at error for each contract file under a kind directory that declares no contract ID of its directory's kind, is not named `<kind>-NNNN-<slug>.<ext>` after that ID, or has no row whose ID and File agree with it
    And it is also raised for a row that names no contract file, and for a contract number that more than one contract declares

  # AC-0001-0054-04
  Scenario: Only a db contract that declares one DB ID takes part in the apply-order check
    Given the story tree, and `db/` contracts whose DDL points a foreign key at a table another contract creates
    When `qfai validate --profile sdd` runs
    Then `QFAI-CONTRACT-036` takes a `db/` file as the owner of the tables it creates only when the file declares exactly one contract ID and that ID is a `DB-NNNN` ID
    And a `db/` file that declares an ID of another kind, or more than one ID, neither owns a table nor receives that finding
```
