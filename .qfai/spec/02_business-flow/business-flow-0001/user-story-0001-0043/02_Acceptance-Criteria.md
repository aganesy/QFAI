# Acceptance Criteria

## Criteria

```gherkin
Feature: Canonical assistant-tree layers
  # AC-0001-0043-01
  Scenario: An unknown assistant-tree directory is reported
    Given a project on the `rule/ skill/ agent/ prompt/` assistant tree with a directory under `.qfai/assistant/` whose name is not one of the layers `rule`, `skill`, `step`, `agent` and `prompt`
    When `qfai validate` runs
    Then `QFAI-ASSISTANT-001` is emitted at warning naming the directory, and the layers `rule`, `skill`, `step`, `agent` and `prompt` are enumerated in the finding text
    And a `skill.local/` directory raises no finding
```
