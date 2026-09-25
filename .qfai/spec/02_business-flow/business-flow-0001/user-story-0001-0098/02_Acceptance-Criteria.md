# Acceptance Criteria

## Criteria

```gherkin
Feature: Simplified Handoff Schema

# AC-0001-0098-01
# Parent: US-0001-0098
Scenario: Read implementation inputs from DCON-008
  Given a current DCON-008 `prototype-handoff.yaml` with `imageSources[]` provenance
  When `/qfai-implement` starts work from that handoff
  Then it reads `finalArtifact` as the final prototype artifact
  And it reads `extractedDesignSystem` as the deterministic design-system input
  And it does not require an exactly-four-field schema or the retired `mustPreserve`, `mayAdapt` and `mustNotCopy` fields
```
