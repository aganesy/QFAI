# Acceptance Criteria

## Criteria

```gherkin
Feature: Resolve active discussion pack via single helper

# AC-0001-0160-01
# Parent: US-0001-0160
Scenario: Active discussion pack resolved via single helper over `state.json`
  Given downstream `/qfai-sdd` skills need the active discussion pack,
  When the pack is resolved,
  Then it is read through one helper from `.qfai/state.json#discussion.currentId` (the SSOT written by `/qfai-discussion`, spec-0010) and is NOT inferred from filesystem mtime.

# AC-0001-0160-02
# Parent: US-0001-0160
Scenario: Ambiguous active pointer surfaces recovery guidance
  Given `.qfai/state.json#discussion.currentId` is absent OR resolves to a missing/duplicate pack,
  When the helper resolves the active pack,
  Then it raises an error naming the candidate `discussion-*` dirs and the recovery command (`qfai discussion use <id>`).
```
