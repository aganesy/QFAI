# Acceptance Criteria

## Criteria

```gherkin
Feature: The assistant-tree mirror follows the renamed tree

# AC-0002-0022-01
# Parent: US-0002-0022
Scenario: The repository-root assistant tree follows the singular directory names
  Given the packaged assistant tree holds the rule, skill, agent and prompt directories
  When pnpm sync:ssot runs
  Then the repository-root rule, skill, agent and prompt paths resolve to the packaged assets
  And pnpm ci:gate:ssot reports no diff
  And no catalog directory exists after project context moves to the policy and contract trees
  And no path is allowed to exist in the repository-root tree alone, a migration memo included
  And when a retired directory name such as skills, agents, prompts, constitution, manifest or process is left under the repository-root assistant tree, link-assistant-tree --check exits 1 naming it
```
