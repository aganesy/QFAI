# Acceptance Criteria

## Criteria

```gherkin
Feature: Assistant tree

# AC-0001-0012-01
# Parent: US-0001-0012
Scenario: The assistant tree has four top-level directories
  Given an assistant tree in the `rule/ skill/ agent/ prompt/` layout
  When the entries directly under `.qfai/assistant/` are listed
  Then they are `rule/`, `skill/`, `agent/` and `prompt/`, plus `skill.local/` where the project created one
  And `constitution/`, `manifest/`, `catalog/` and `process/` are absent

# AC-0001-0012-02
# Parent: US-0001-0012
Scenario: A shared assistant file goes to rule/ and a single-skill file to its skill
  Given an assistant file in the `rule/ skill/ agent/ prompt/` layout
  When its readers are counted
  Then a file read by several skills or by the CLI sits under `rule/`
  And a file read by one skill sits under that skill's `references/`
```
