# Acceptance Criteria

## Criteria

```gherkin
Feature: discussion-to-SDD handoff
  # AC-0001-0017-01
  Scenario: SDD consumes a selected discussion pack as source material
    Given SDD preflight selected a usable discussion pack with requirements, sources, and a completed review
    When `/qfai-sdd` prepares the story tree
    Then it reads the selected pack and records source provenance in SDD-owned evidence
    And it records a discrepancy in an SDD-owned decision rather than rewriting the discussion pack
```
