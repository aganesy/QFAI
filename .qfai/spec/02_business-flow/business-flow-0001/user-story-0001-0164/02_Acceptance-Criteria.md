# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0164-01
# Parent: US-0001-0164
Scenario: AC-0001-0164-01
  Given design-system prerequisites exist
  When their validators are selected
  Then Design-system related validators continue to run when their prerequisite files/artifacts exist.
  And Legacy `full-harness` wording inside validator slices is treated as artifact vocabulary, not as a public command contract.

# AC-0001-0164-02
# Parent: US-0001-0164
Scenario: Verify Loads the Story-Tree Directories
  Given a project on the story tree,
  When `/qfai-verify` loads context through `references/context-load.md`,
  Then it reads the spec tree from `<paths.specsDir>`, contracts from `<paths.contractsDir>`, `tech.md` and `structure.md` from `<paths.contractsDir>`, and the product facts from the policy files `objective.md`, `initiative.md` and `principle.md` under `<paths.specsDir>/01_policy/`.

# AC-0001-0164-03
# Parent: US-0001-0164
Scenario: Verify Reads Decisions From decisions.md
  Given a project on the story tree,
  When `/qfai-verify` gathers its decision sources,
  Then it reads the rows of `decisions.md`, cites them by `DEC-NNNN`, and treats a row with Status REJECTED as a rejected option.
```
