# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0048-01
# Parent: US-0001-0048
Scenario: AC-0001-0048-01
  Given a `qfai-*` SKILL.md whose body references a path that no longer resolves under the 4-layer layout (e.g., `.qfai/assistant/steering/agent-routing.yml`)
  When `qfai validate` runs
  Then `W-SKILL-DOC-BROKEN-REF` is emitted; severity is `warning` during the deprecation window (running tool version < `LEGACY_STEERING_SUNSET`) and escalates to `error` once the tool version reaches or passes the sunset minor. The message headline branches with the severity so consumers can distinguish "Read-compatible only" (pre-sunset) from "past the announced sunset" (post-sunset). User-defined (non-`qfai-*`) skills are NOT flagged.
  And With the `rule/ skill/ agent/ prompt/` assistant tree, a reference resolves only under those four layers, so a reference into `constitution/`, `manifest/`, `catalog/` or `process/` is reported the same way

# AC-0001-0048-02
# Parent: US-0001-0048
Scenario: AC-0001-0048-02
  Given a validate run on a project that just completed `qfai init --upgrade-assistant-tree`
  When the migration emitted `W-USER-EDIT-PRESERVED` informational notes
  Then the validator recognizes those notes as informational pass-throughs (`info` severity, not warning/error); they appear in the validate report under "Informational" without failing any gate
```
