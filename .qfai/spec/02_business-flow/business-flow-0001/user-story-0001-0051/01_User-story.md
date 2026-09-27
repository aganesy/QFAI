# US-0001-0051: SaaS package validation profile

## User Story

As a delivery lead shipping a SaaS-tenant project, I want `qfai validate --profile saas-package` to pass only when the prototyping-profile validate passes, a design-system attestation exists at `<paths.contractsDir>/design/design-system.yaml` and the cross-skill handoff schema passes, and to name each skipped ATDD or implement-class gate in a `D-SAAS-PACKAGE-VERIFY-SKIPPED` info finding, so that a SaaS-tenant delivery gets a lightweight gate that never claims work it did not check.
