# Acceptance Criteria

## Criteria

```gherkin
Feature: Validate warns when tech.md names a catalogue no registry serves
  # AC-0001-0306-01
  Scenario: A named catalogue with no registry is a warning
    Given a `tech.md` under `paths.contractsDir` whose Stack table names a component catalogue in its `Component catalogue` row
    And `qfai.config.yaml` declares no `uiux.registries`, or declares it with no valid entry
    When `qfai validate` runs in the `sdd`, `verify` or `full` profile
    Then it raises `QFAI-STORY-021` at warning naming `tech.md` and the catalogue
    And the other profiles raise no `QFAI-STORY-021`

  # AC-0001-0306-02
  Scenario: A catalogue with a registry raises nothing
    Given the `tech.md` of AC-0001-0306-01
    And `qfai.config.yaml` declares at least one valid `uiux.registries` entry
    When `qfai validate` runs
    Then it raises no `QFAI-STORY-021`

  # AC-0001-0306-03
  Scenario: A row that names no catalogue raises nothing
    Given a `tech.md` whose `Component catalogue` row is empty, an angle-bracket placeholder or states none, or a tree with no `tech.md`, no Stack table or no such row
    And `qfai.config.yaml` declares no `uiux.registries`
    When `qfai validate` runs
    Then it raises no `QFAI-STORY-021`
```
