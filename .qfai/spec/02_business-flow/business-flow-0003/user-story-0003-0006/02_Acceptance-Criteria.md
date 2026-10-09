# Acceptance Criteria

## Criteria

```gherkin
Feature: playwright primary probe
  # AC-0003-0006-01
  Scenario: The probe reports the first launcher stage that resolves
    Given a prototyping-profile project
    When `qfai doctor --profile prototyping` runs
    Then the probe tries (1) `node_modules/.bin/playwright` (on Windows the `.cmd` / `.bat` / `.ps1` shims), then (2) `npx --no-install playwright --version`, and reports the first stage that resolves as the launcher
    And when `node_modules/.bin/playwright` exists, the primary stage resolves it

  # AC-0003-0006-02
  Scenario: The error names the install command when every probe fails
    Given playwright is found neither through `node_modules` nor through `npx`
    When `qfai doctor --profile prototyping` runs
    Then the error text contains the install hint `npm i -D playwright`
    And the severity is error

  # AC-0003-0006-03
  Scenario: A fresh init reports no launcher error
    Given a project where `npm i -D playwright` ran right after `qfai init`
    When `qfai doctor --profile prototyping` runs
    Then the launcher check `prototyping.playwrightCli` contributes no line prefixed with `[error]` (NFR-0112)

  # AC-0003-0006-05
  Scenario: The DESIGN.md readiness check names the file it read
    Given a prototyping-profile project
    When `qfai doctor --profile prototyping` runs
    Then the `prototyping.designMdReadiness` check, titled `Root DESIGN.md readiness`, names root `DESIGN.md` in `details.designMd`
    And it is `ok` when the readiness checks find nothing, and otherwise lists their findings in `details.issues`
```
