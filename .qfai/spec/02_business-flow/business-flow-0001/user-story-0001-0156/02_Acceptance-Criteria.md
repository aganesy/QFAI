# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion Markdown-Only Preflight

# AC-0001-0156-01
# Parent: US-0001-0156
Scenario: Missing Markdown Blocks Preflight
  Given a discussion-pack with missing required markdown files
  When SDD preflight runs
  Then SDD is blocked with the missing markdown listed in blockers.

# AC-0001-0156-02
# Parent: US-0001-0156
Scenario: Optional Side Artifact Does Not Block Preflight
  Given a discussion-pack whose required markdown is complete but optional side artifacts are absent or malformed
  When SDD preflight runs
  Then side artifact state alone does not block SDD.
```
