# Acceptance Criteria

## Criteria

```gherkin
Feature: non-UI safe skip

# AC-0001-0018-01
# Parent: US-0001-0018
Scenario: 非 UI パックは sidecar requirement をバイパスする
  Given non-UI discussion pack
  When discussion completion を検証する
  Then UI sidecar 欠落だけではエラーにならない
```
