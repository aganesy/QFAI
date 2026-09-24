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
Scenario: W-USER-EDIT-PRESERVED 出力
  Given 旧 `.qfai/assistant/steering/` 配下にユーザー編集のあるファイルが存在する
  When `qfai init --upgrade-assistant-tree` を実行する
  Then ユーザー編集ファイルは新 layer 側にコピーされ、ファイルパスを naming した `W-USER-EDIT-PRESERVED` informational note が stdout に少なくとも 1 件出力される
```
