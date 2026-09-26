# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion source handoff to SDD

# AC-0001-0017-01
# Parent: US-0001-0017
Scenario: SDD consumes a selected discussion pack as source material
  Given SDD preflight selected a usable discussion pack with requirements, sources, and a completed review
  When `/qfai-sdd` prepares the story tree
  Then it reads the selected pack and records source provenance in SDD-owned evidence
  And it records a discrepancy in an SDD-owned decision rather than rewriting the discussion pack
```
