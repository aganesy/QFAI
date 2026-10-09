# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped workflow ownership contract
  # AC-0002-0007-01
  Scenario: Ownership comes from the shipped name lists
    Given a fixture whose adopter workflows directory holds an adopter-created file whose name collides with a name QFAI ships, and a hand-edited file QFAI wrote earlier
    When the write-set resolution path is inspected against `.qfai/spec/03_contract/cli/cli-0018-shipped-workflows.md` and `qfai init` runs on the fixture
    Then the `qfai-` prefix is a reservation notice and never a selector: the write set equals the in-binary `SHIPPED_WORKFLOW_NAMES` and does not come from a `qfai-*` glob over the adopter's disk
    And both files stay byte-for-byte unchanged
    And init writes no record of what it wrote
    And writing goes only through `copyTemplateTree` and `copyTemplatePaths`, and the path holds no `copyFile`, `writeFile`, `rm` or `unlink` call of its own

  # AC-0002-0007-02
  Scenario: A shipped workflow the adopter deleted is written again
    Given a shipped workflow the adopter deleted from `.github/workflows/`
    When `qfai init` runs
    Then the file is written again from the shipped template, as create-only writes any absent file

  # AC-0002-0007-04
  Scenario: A shipped workflow the project lists is not written
    Given `workflow.skipShipped` in `qfai.config.yaml` lists a shipped workflow name
    When `qfai init` runs
    Then that workflow is not written, however many times init runs
    And every shipped workflow the key does not list is written as before
```
