# Acceptance Criteria

## Criteria

```gherkin
Feature: DESIGN.md sha256 Lock at Phase 0

# AC-0001-0157-01
# Parent: US-0001-0157
Scenario: SDD Phase 0 DESIGN.md sha256 Lock
  Given root `DESIGN.md` exists at `/qfai-sdd` Phase 0 entry in the spec-pack layout, or at the 03-contract step on the story tree,
  When Phase 0 completes in the spec-pack layout, or the 03-contract step completes on the story tree,
  Then `<paths.contractsDir>/design/DESIGN.md.lock.yaml` exists with `sha256: <hex>` matching `sha256(DESIGN.md bytes)` and a `lockedAt` ISO 8601 timestamp.
  And Missing root `DESIGN.md` halts Phase 0 and surfaces as an error-severity finding in the design contract validator family owned by spec-0004. On the story tree it halts the 03-contract step with the same finding.
```
