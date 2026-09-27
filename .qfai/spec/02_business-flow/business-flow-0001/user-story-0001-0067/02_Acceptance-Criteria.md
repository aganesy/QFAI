# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping Observability Section

# AC-0001-0067-01
# Parent: US-0001-0067
Scenario: Prototyping セクション出力
  Given prototyping evidence が存在する
  When `qfai report --format md` を実行する
  Then report.md に ## Prototyping セクションが含まれる
  And mode, obligations, evidence coverage, render, browserQa, calibration サブセクションが含まれる
  And screenshot / HTML の欠落は収束後の accepted iteration の各 screen に属する `evidenceRefs[]` の `{kind, path}` と validation findings から判断し、旧 per-iteration capture script や `QFAI-UIE-001/002` を前提にしない

# AC-0001-0067-02
# Parent: US-0001-0067
Scenario: Prototyping セクション — evidence なし
  Given prototyping evidence が存在しない
  When `qfai report --format md` を実行する
  Then report.md に ## Prototyping セクションが含まれる
  And `Status: no-pack` と表示され、存在しない evidence の成功を示さない
```
