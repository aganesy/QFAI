# Acceptance Criteria

## Criteria

```gherkin
Feature: Legacy Sidecar Drop

# AC-0001-0091-01
# Parent: US-0001-0091
Scenario: legacy sidecars not emitted
  Given a fresh `/qfai-discussion` UI-bearing run,
  When the produced sidecars are listed,
  Then `33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md` are NOT created. Producing them is a regression and triggers the skill validator under this spec.
```
