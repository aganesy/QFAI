# Acceptance Criteria

## Criteria

```gherkin
Feature: The assistant-tree mirror follows the renamed tree
  # AC-0002-0022-01
  Scenario: The repository-root assistant tree follows the singular directory names
    Given the packaged assistant tree holds the rule, skill, agent and prompt directories
    When pnpm sync:ssot runs
    Then the repository-root rule, skill, agent and prompt paths resolve to the packaged assets
    And check mode reports an owned same-target directory link that cannot be followed as drift, names it and exits 1 without changing it even when its target text matches
    And directory-type repair recreates only that owned same-target link as a directory link
    And healthy and foreign links remain unchanged
    And repair preserves canonical files, the primary checkout and sibling sentinel paths
    And pnpm ci:gate:ssot reports no diff
    And no catalog directory exists after project context moves to the policy and contract trees
    And no path is allowed to exist in the repository-root tree alone, a migration memo included
    And when a retired directory name such as skills, agents, prompts, constitution, manifest or process is left under the repository-root assistant tree, link-assistant-tree --check exits 1 naming it
```
