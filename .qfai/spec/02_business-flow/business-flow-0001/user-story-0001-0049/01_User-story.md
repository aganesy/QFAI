# US-0001-0049: SaaS package validation profile

## User Story

As a delivery lead shipping a SaaS-tenant project, I want `qfai validate --profile saas-package` to pass only when the prototyping-profile validate passes, the design-system attestation, root `DESIGN.md`, is present and parses, and the cross-skill handoff schema passes, and to name each skipped ATDD or implement-class gate in a `D-SAAS-PACKAGE-VERIFY-SKIPPED` info finding, so that a SaaS-tenant delivery gets a lightweight gate that never claims work it did not check.
