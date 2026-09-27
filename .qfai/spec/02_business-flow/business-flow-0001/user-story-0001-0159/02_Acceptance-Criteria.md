# Acceptance Criteria

## Criteria

```gherkin
Feature: UI contract `primary_tasks` slot per screen

# AC-0001-0159-01
# Parent: US-0001-0159
Scenario: UI contract template carries a `primary_tasks` list
  Given the shipped UI contract template `packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/contracts/ui-contract.sample.yaml`,
  When the template is read at `qfai init` time or by `/qfai-sdd` during contract authoring,
  Then every entry in `screens[]` carries a `primary_tasks` list AND the requirements-analyst agent guide (under `.qfai/assistant/agent/requirements-analyst.md` or equivalent) instructs authoring ≥ 1 primary_task per screen.

# AC-0001-0159-02
# Parent: US-0001-0159
Scenario: validate lane blocks `/qfai-prototyping` when `primary_tasks` empty
  Given a UI contract under `<paths.contractsDir>/ui/` in which a `screens[]` entry has an empty `primary_tasks` list or no `primary_tasks` key,
  When the new validate lane (QFAI-AUD-001 aligned) runs as part of `qfai validate --fail-on error`,
  Then the lane FAILS at severity error naming the offending screen ID and the violation, and a missing key's message names the legacy form, AND `/qfai-prototyping` MUST NOT proceed past its preflight gate until each `screens[]` entry has ≥ 1 primary_task; non-empty `primary_tasks` passes the lane silently.
```
