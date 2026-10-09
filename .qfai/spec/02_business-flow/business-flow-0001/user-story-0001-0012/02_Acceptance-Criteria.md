# Acceptance Criteria

## Criteria

```gherkin
Feature: Assistant tree
  # AC-0001-0012-01
  Scenario: The assistant tree has five top-level directories
    Given an assistant tree in the `rule/ skill/ agent/ prompt/` layout
    When the entries directly under `.qfai/assistant/` are listed
    Then they are `rule/`, `skill/`, `step/`, `agent/` and `prompt/`, plus `skill.local/` where the project created one
    And `constitution/`, `manifest/`, `catalog/` and `process/` are absent

  # AC-0001-0012-02
  Scenario: A rule's detail goes to rule/references/ and a skill's detail to its references/
    Given an assistant file in the `rule/ skill/ agent/ prompt/` layout
    When the tree that owns the file is identified
    Then a rule sits under `rule/`, and detail that a rule cites sits under `rule/references/`
    And detail that belongs to a skill sits under that skill's `references/`, and some asset in the tree cites it
```
