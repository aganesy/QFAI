# Acceptance Criteria

## Criteria

```gherkin
Feature: playwright primary probe

# AC-0003-0006-01
# Parent: US-0003-0006
Scenario: playwright primary probe
  Given a prototyping-profile project
  When `qfai doctor --profile prototyping` runs
  Then the probe tries (1) `node_modules/.bin/playwright` (on Windows the `.cmd` / `.bat` / `.ps1` shims), then (2) `npx --no-install playwright --version`, then (3) the deprecated `playwright-cli`, and reports the first stage that resolves as the launcher
  And when `node_modules/.bin/playwright` exists, the primary stage resolves it

# AC-0003-0006-02
# Parent: US-0003-0006
Scenario: playwright probe 全失敗時の error text
  Given playwright も playwright-cli も node_modules / npx で見つからない
  When `qfai doctor --profile prototyping` を実行する
  Then error text に install hint `npm i -D playwright` が含まれる
  And severity は error

# AC-0003-0006-03
# Parent: US-0003-0006
Scenario: fresh init で error なし
  Given `qfai init` 直後に `npm i -D playwright` を実行したプロジェクト
  When `qfai doctor --profile prototyping` を実行する
  Then 出力に `[error]` 接頭辞付きの行が 1 つも含まれない (NFR-0112)

# AC-0003-0006-04
# Parent: US-0003-0006
Scenario: playwright-cli is the only launcher found
  Given only `playwright-cli` resolves in `node_modules`
  When `qfai doctor --profile prototyping` runs
  Then `D-DEPRECATED-PROBE` is emitted at severity `error` with `sunset: 1.10.0` in its message
```
