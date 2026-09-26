# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0051-01
# Parent: US-0001-0051
Scenario: AC-0001-0051-01
  Given a SaaS-tenant repo whose prototyping-profile validate PASSes, with a DCON-005 design-system attestation present at `<paths.contractsDir>/design/design-system.yaml` and a conforming CLI-HANDOFF cross-skill handoff
  When `qfai validate --profile saas-package` runs
  Then validate PASSes; the ATDD / implement-class gates are SKIPPED and each skip is surfaced as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (severity info) finding naming the skipped gate
  And when any of the three required conditions fails (prototyping-profile fails, DCON-005 attestation absent, or CLI-HANDOFF schema fails), `qfai validate --profile saas-package` does NOT PASS
```
