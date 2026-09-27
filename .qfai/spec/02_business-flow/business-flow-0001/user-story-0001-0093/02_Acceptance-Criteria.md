# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion writes the active session pointer

# AC-0001-0093-01
# Parent: US-0001-0093
Scenario: `/qfai-discussion` writes the active session pointer
  Given a `/qfai-discussion` run finalizing a pack,
  When the pack is finalized,
  Then `.qfai/state.json#discussion.currentId` is set to the just-authored pack ID (the single SSOT for the active session); `qfai discussion list --active` reads this value rather than inferring from filesystem timestamps.

# AC-0001-0093-02
# Parent: US-0001-0093
Scenario: An absent or dangling pointer resolves only to a lone pack
  Given `.qfai/state.json#discussion.currentId` is absent or names no existing pack,
  When `qfai discussion list --active` resolves the active pointer,
  Then with no pointer and exactly one `discussion-*` dir, that pack is returned with exit 0 and a stderr note that no pointer is set
  And with no pointer and more than one `discussion-*` dir, or a pointer naming no existing pack, an error is raised naming the candidate `discussion-*` dirs and the recovery command (`qfai discussion use <id>`); the active session is NOT inferred from mtime.
```
