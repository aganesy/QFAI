# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion writes the active session pointer
  # AC-0001-0090-01
  Scenario: `/qfai-discussion` writes the active session pointer
    Given a `/qfai-discussion` run finalizing a pack
    When the pack is finalized
    Then `.qfai/state.json#discussion.currentId` is set to the ID of the pack just written, the single source of the active session
    And `qfai discussion list --active` reads this value rather than inferring it from file timestamps

  # AC-0001-0090-02
  Scenario: An absent or dangling pointer resolves only to a lone pack
    Given `.qfai/state.json#discussion.currentId` is absent or names no existing pack
    When `qfai discussion list --active` resolves the active pointer
    Then with no pointer and exactly one `discussion-*` directory, that pack is returned with exit 0 and a stderr note that no pointer is set
    And with no pointer and more than one `discussion-*` directory, or a pointer naming no existing pack, an error is raised naming the candidate `discussion-*` directories and the recovery command (`qfai discussion use <id>`), and the active session is not inferred from mtime
```
