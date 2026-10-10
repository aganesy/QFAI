# Acceptance Criteria

## Criteria

```gherkin
Feature: Contract-first verification gates
  # AC-0001-0158-01
  Scenario: Design-system validators run when their prerequisites exist
    Given design-system prerequisites exist
    When their validators are selected
    Then the design-system validators report on the prerequisite files and report nothing when those files are absent.
    And no shipped source, asset or command names `full-harness`.

  # AC-0001-0158-02
  Scenario: Verify Loads the Story-Tree Directories
    Given a project on the story tree,
    When `/qfai-verify` loads context through `references/context-load.md`,
    Then it reads the spec tree from `<paths.specsDir>`, contracts from `<paths.contractsDir>`, `tech.md` from `<paths.contractsDir>`, and the product facts from the policy files `objective.md`, `initiative.md` and `principle.md` under `<paths.specsDir>/01_policy/`.

  # AC-0001-0158-03
  Scenario: Verify Reads Decisions From decisions.md
    Given a project on the story tree,
    When `/qfai-verify` gathers its decision sources,
    Then it reads the rows of `decisions.md`, cites them by `DEC-NNNN`, and treats a row with Status REJECTED as a rejected option.
```
