# Acceptance Criteria

## Criteria

```gherkin
Feature: DESIGN.md sha256 Lock

# AC-0001-0157-01
# Parent: US-0001-0157
Scenario: SDD Stage 4 DESIGN.md sha256 Lock
  Given root `DESIGN.md` on the story tree, for a visual UI surface
  When Stage 4 of `/qfai-sdd` freezes it
  Then `<paths.contractsDir>/design/DESIGN.md.lock.yaml` holds `designMdSha256` matching the sha256 of the file and a `frozenAt` timestamp
  And with root `DESIGN.md` absent, the readiness gate reports `QFAI-DCON-030` at error
```
