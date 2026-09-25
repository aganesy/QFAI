# Acceptance Criteria

## Criteria

```gherkin
Feature: Policy and contract layers

# AC-0001-0006-01
# Parent: US-0001-0006
Scenario: The policy layer holds five files of principles
  Given a project on the story tree
  When `01_policy/` is listed
  Then it holds `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`
  And none of them states a concrete definition that belongs to a flow, a story or a contract

# AC-0001-0006-02
# Parent: US-0001-0006
Scenario: The contract layer is indexed and states the gate commands once
  Given a project on the story tree
  When the contract layer at `paths.contractsDir` is read
  Then it holds `contracts.md`, `tech.md`, `structure.md` and the directories `api/`, `db/`, `ui/`, `cli/` and `design/`
  And `contracts.md` lists every contract file under those directories
  And the quality-gate commands appear only in the `## Standard commands (copy-paste)` section of `tech.md`
```
