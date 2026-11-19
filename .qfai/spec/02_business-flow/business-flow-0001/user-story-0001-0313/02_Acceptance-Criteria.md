# Acceptance Criteria

## Criteria

```gherkin
Feature: A checkout that did not reinstall after a qfai upgrade is caught
  # AC-0001-0313-01
  Scenario: A stale install warns on every command and stops workflow plan and the gates
    Given a project whose own `node_modules/qfai` is an installed copy of the running qfai
    And whose lockfile pins another version
    When a qfai command runs in it
    Then stderr carries one line naming both versions and the install command
    And `qfai validate`, `qfai sdd preflight`, `qfai report --run-validate` and `qfai workflow plan` exit 1 without running
    And a lockfile that pins the running version, and a copy `node_modules/qfai` links to as `npm link` leaves it, print no such line and stop nothing
```
