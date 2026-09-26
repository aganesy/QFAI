# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0166-01
# Parent: US-0001-0166
Scenario: SaaS-Package Certify Scope Seal
  Given a UI-bearing SaaS-tenant project whose prototyping evidence is complete but whose ATDD / implement-class gates were intentionally skipped,
  When `qfai prototyping certify --scope saas-package` is run,
  Then the sealed `completion-certificate.json` MUST carry `scope: "saas-package"` and a non-empty `notes:` field that names each skipped gate, MUST NOT claim full DONE, and `--upgrade-scope full` MUST be rejected until the missing gates land — at which point it may upgrade the existing certificate to full scope.
```
