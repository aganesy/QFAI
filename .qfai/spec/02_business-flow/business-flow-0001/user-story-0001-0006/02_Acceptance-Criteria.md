# Acceptance Criteria

## Criteria

```gherkin
Feature: Policy and contract layers
  # AC-0001-0006-01
  Scenario: The policy layer holds five files of principles
    Given a project on the story tree
    When `01_policy/` is listed
    Then it holds `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`
    And none of them states a concrete definition that belongs to a flow, a story or a contract
    And `constraint.md` states each limit in plain words, under IDs that run from 01 in each section

  # AC-0001-0006-02
  Scenario: The contract layer is indexed and states the gate commands once
    Given a project on the story tree
    When the contract layer at `paths.contractsDir` is read
    Then it holds `contracts.md`, `tech.md` and the directories `api/`, `db/`, `ui/` and `cli/`
    And `contracts.md` lists every contract file under those directories
    And the quality-gate commands appear only in the `## Standard commands (copy-paste)` section of `tech.md`
    And `tech.md` draws the layers of the code under `## Architecture` as one flowchart, then lists them from the uppermost down, each with the layers below it that it may import from
```
