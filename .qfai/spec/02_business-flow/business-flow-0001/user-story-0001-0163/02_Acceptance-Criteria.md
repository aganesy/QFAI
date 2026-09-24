# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0163-01
# Parent: US-0001-0163
Scenario: AC-0001-0163-01
  Given reviewer artifacts exist
  When /qfai-verify evaluates completion
  Then Verify inspects reviewer artifacts and blocks on `REVISE`.

# AC-0001-0163-02
# Parent: US-0001-0163
Scenario: Prototyping Evidence Path Layout
  Given a `/qfai-verify` run on a UI-bearing repo,
  When prototyping evidence is inspected,
  Then the active layout is `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` per iter; the legacy `screenshots/` / `html/` directory layout is no longer accepted as the active SSOT.
```
