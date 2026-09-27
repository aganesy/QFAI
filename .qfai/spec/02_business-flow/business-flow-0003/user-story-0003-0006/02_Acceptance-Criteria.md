# Acceptance Criteria

## Criteria

```gherkin
Feature: playwright primary probe
  # AC-0003-0006-01
  Scenario: The probe reports the first launcher stage that resolves
    Given a prototyping-profile project
    When `qfai doctor --profile prototyping` runs
    Then the probe tries (1) `node_modules/.bin/playwright` (on Windows the `.cmd` / `.bat` / `.ps1` shims), then (2) `npx --no-install playwright --version`, then (3) the deprecated `playwright-cli`, and reports the first stage that resolves as the launcher
    And when `node_modules/.bin/playwright` exists, the primary stage resolves it

  # AC-0003-0006-02
  Scenario: The error names the install command when every probe fails
    Given neither playwright nor playwright-cli is found through `node_modules` or `npx`
    When `qfai doctor --profile prototyping` runs
    Then the error text contains the install hint `npm i -D playwright`
    And the severity is error

  # AC-0003-0006-03
  Scenario: A fresh init reports no error
    Given a project where `npm i -D playwright` ran right after `qfai init`
    When `qfai doctor --profile prototyping` runs
    Then the output holds no line prefixed with `[error]` (NFR-0112)

  # AC-0003-0006-04
  Scenario: playwright-cli is the only launcher found
    Given only `playwright-cli` resolves in `node_modules`
    When `qfai doctor --profile prototyping` runs
    Then `D-DEPRECATED-PROBE` is emitted at severity `error` with `sunset: 1.10.0` in its message
```
