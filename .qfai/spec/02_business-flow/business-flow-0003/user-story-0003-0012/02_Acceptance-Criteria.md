# Acceptance Criteria

## Criteria

```gherkin
Feature: Doctor failure threshold

# AC-0003-0012-01
# Parent: US-0003-0012
Scenario: --fail-on error で warning は pass
  Given doctor チェックで warning のみ検出される
  When `qfai doctor --fail-on error` を実行する
  Then 終了コード 0 で終了する

# AC-0003-0012-02
# Parent: US-0003-0012
Scenario: --fail-on warning で warning は fail
  Given doctor チェックで warning が検出される
  When `qfai doctor --fail-on warning` を実行する
  Then 終了コード 1 で終了する

# AC-0003-0012-03
# Parent: US-0003-0012
Scenario: An error alone fails --fail-on warning
  Given doctor detects an error and no warning
  When `qfai doctor --fail-on warning` runs
  Then the exit code is 1

# AC-0003-0012-04
# Parent: US-0003-0012
Scenario: An omitted --fail-on follows the configured threshold
  Given `qfai.config.yaml` leaves `validation.failOn` at its shipped default `error`, and doctor detects an error
  When `qfai doctor` runs without `--fail-on`
  Then the exit code is 1
  And with `--fail-on never` the same tree exits 0
```
