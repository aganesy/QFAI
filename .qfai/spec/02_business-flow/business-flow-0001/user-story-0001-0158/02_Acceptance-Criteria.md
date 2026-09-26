# Acceptance Criteria

## Criteria

```gherkin
Feature: Active Design Contract Surface Reduction

# AC-0001-0158-01
# Parent: US-0001-0158
Scenario: Legacy Design Contracts Removed
  Given a fresh `/qfai-sdd` run,
  When `_policies/05_Contracts.md` Active Contract Sets / Design Contracts is read,
  Then `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, and `brand-design.yaml` are NOT present in the active rows. History-only annotations remain permitted in `09_delta.md`.

# AC-0001-0158-02
# Parent: US-0001-0158
Scenario: Active Design Contract Index = {design-system, prototype-handoff, DESIGN.md, DESIGN.md.lock.yaml, mirror validator}
  Given the post-decomposition contract index,
  When the active design-contract entries are listed,
  Then the set is exactly `{design-system.yaml, prototype-handoff.yaml, DESIGN.md, DESIGN.md.lock.yaml, design-system mirror validator}`.
```
