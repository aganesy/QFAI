# Acceptance Criteria

## Criteria

```gherkin
Feature: Required Edge Enforcement

# AC-0001-0154-01
# Parent: US-0001-0154
Scenario: Story-Tree Required Edges
  Given the story tree,
  When `/qfai-sdd` gates it with `qfai validate --profile sdd --fail-on error`,
  Then every EX names exactly one AC in its `AC-Ref` cell, every AC has at least one EX, every BR cites at least one EX, and every EX is cited by at least one BR. A missing or broken edge fails the gate, naming the ID and its file.
```
