# Acceptance Criteria

## Criteria

```gherkin
Feature: Design System As Input

# AC-0001-0099-01
# Parent: US-0001-0099
Scenario: Design System As Deterministic DESIGN.md Mirror
  Given `extractedDesignSystem` resolves to `<paths.contractsDir>/design/design-system.yaml`
  When `/qfai-implement` reads token tables
  Then those tables are byte-equivalent to the parsed token tables of root `DESIGN.md` (color / typography / radius / shadow). The mirror invariant is enforced at validate time by the design contract validators owned by spec-0004.
```
