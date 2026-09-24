# Acceptance Criteria

## Criteria

```gherkin
Feature: Drift Protocol 体系化

# AC-0001-0002-01
# Parent: US-0001-0002
Scenario: Drift Protocol の手順が定義されている
  Given drift-protocol.md を参照する
  When ドリフト検出時の手順を確認する
  Then STOP → CR → 承認 → owner skill rerun → 再開 の手順が定義されている
  And on the story tree, a change request is a row opening `Change request:` that is appended to `decisions.md` at TODO
  And on the story tree, approval moves that row to WIP, the owner skill reruns, and the row ends DONE
```
