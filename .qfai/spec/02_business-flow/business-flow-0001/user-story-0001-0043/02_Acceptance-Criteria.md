# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0043-01
# Parent: US-0001-0043
Scenario: AC-0001-0043-01
  Given a project on the `rule/ skill/ agent/ prompt/` assistant tree with a directory under `.qfai/assistant/` whose name is not one of those four layers
  When `qfai validate` runs
  Then `W-ASSISTANT-LAYOUT` is emitted at warning naming the directory, and the layers `rule`, `skill`, `agent` and `prompt` are enumerated in the finding text
  And a directory under a name those four replaced, such as `catalog/`, is reported the same way; the pre-recut `steering/` directory raises `D-DEPRECATED-PATH` at error instead; a `skill.local/` directory raises no finding
```
