# Acceptance Criteria

## Criteria

```gherkin
Feature: Drift Protocol 体系化

# AC-0001-0002-01
# Parent: US-0001-0002
Scenario: Drift Protocol の手順が定義されている
  Given drift-protocol.md を参照する
  When ドリフト検出時の手順を確認する
  Then 影響範囲の停止 → CR 記録 → 承認 → owner skill rerun → 依存義務の再検査 → DONE の手順が定義されている
  And on the story tree, a change request is a row opening `Change request:` that is appended to `decisions.md` at TODO
  And on the story tree, approval moves that row to WIP, the owner skill reruns, and the row ends DONE

# AC-0001-0002-02
# Parent: US-0001-0002
Scenario: A bugfix that changes no upstream file raises no change request
  Given the shipped `drift-protocol.md`
  When its allowed exceptions are read
  Then every exception it listed before is still listed
  And it states that a bugfix which changes no file of the story tree or the contract layer raises no change request, because no upstream change happened
```
