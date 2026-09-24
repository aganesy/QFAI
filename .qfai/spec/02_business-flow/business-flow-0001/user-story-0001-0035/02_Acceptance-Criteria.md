# Acceptance Criteria

## Criteria

```gherkin
Feature: --upgrade-assistant-tree migration helper

# AC-0001-0035-01
# Parent: US-0001-0035
Scenario: --upgrade-assistant-tree flag
  Given a project on the legacy layout, with only `.qfai/assistant/steering/`
  When `qfai init --upgrade-assistant-tree` runs
  Then the four new layer directories are added, and the seeded templates under the legacy `steering/` are relocated to their place in the new layers. The exit code is 0
  And with the `rule/ skill/ agent/ prompt/` assistant tree, each file the relocation table names is copied to its destination in that tree, and nothing is written under `constitution/`, `manifest/`, `catalog/` or `process/`

# AC-0001-0035-02
# Parent: US-0001-0035
Scenario: Existing destination is preserved with an informational note
  Given a recognized file exists under legacy `.qfai/assistant/steering/` and its new-layer destination already contains user edits
  When `qfai init --upgrade-assistant-tree` を実行する
  Then the existing destination remains unchanged and the legacy file is not deleted
  And stdout contains a `W-USER-EDIT-PRESERVED` informational note naming the destination path.
```
