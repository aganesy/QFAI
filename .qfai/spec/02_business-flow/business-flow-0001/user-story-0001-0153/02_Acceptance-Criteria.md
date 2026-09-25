# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion-Pack Preflight

# AC-0001-0153-01
# Parent: US-0001-0153
Scenario: No usable source stops SDD
  Given no discussion pack, import-lite input, or explicit user requirement is usable
  When SDD starts
  Then it stops and guides the operator to /qfai-discussion

Scenario: An incomplete discussion pack remains provenance
  Given a discussion pack exists but is incomplete, contradictory, or carries a blocking open question
  When SDD starts
  Then it continues using that pack as non-normative reference material
  And it records the discrepancy in SDD-owned decisions, questions, or evidence
  And it does not edit the discussion pack to clear the discrepancy
```
