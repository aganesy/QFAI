# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0043-01
# Parent: US-0001-0043
Scenario: AC-0001-0043-01
  Given a project with a directory at `.qfai/assistant/steering/` (or any other non-canonical layer name)
  When `qfai validate` runs
  Then a finding is emitted naming the offending directory; the canonical layer enum (`constitution`, `manifest`, `catalog`, `process`) is enumerated in the finding text; severity is at least warning during the deprecation window (D-DEPRECATED-PATH co-fires per REQ-0040)
  And with the `rule/ skill/ agent/ prompt/` assistant tree, the enumerated layers are `rule`, `skill`, `agent` and `prompt`. A `skill.local/` directory raises no finding, and a directory under a name those four replaced is reported like any other non-canonical name
```
