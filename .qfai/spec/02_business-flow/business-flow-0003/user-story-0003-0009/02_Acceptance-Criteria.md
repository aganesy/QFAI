# Acceptance Criteria

## Criteria

```gherkin
Feature: doctor --autoremediate mode
  # AC-0003-0009-01
  Scenario: --autoremediate repairs install, .gitignore and run logs after --yes
    Given the active skill manifest declares uninstalled runtimeDependencies, and a validate run log older than the TTL exists outside the newest runs
    When `qfai doctor --autoremediate --yes` runs
    Then `npm install` runs for the declared dependencies
    And the stale run log is removed (as `--clean` does)
    And `qfai.config.yaml` is not written

  # AC-0003-0009-02
  Scenario: Autoremediate is off in CI and --dry-run has no side effects (error/boundary)
    Given an environment with a standard CI variable set (for example CI=true)
    When `qfai doctor --autoremediate` runs
    Then nothing is remediated and the line "autoremediate disabled in CI" is printed (off by default)
    And separately, `qfai doctor --autoremediate --dry-run` previews the planned repairs without causing any npm install, `.gitignore` write or run-log removal

  # AC-0003-0009-03
  Scenario: --autoremediate without a skill profile skips the install phase
    Given no `--profile <skill>` is passed, outside CI
    When `qfai doctor --autoremediate --yes` runs
    Then no `npm install` runs
    And the output says the install phase is skipped
```
