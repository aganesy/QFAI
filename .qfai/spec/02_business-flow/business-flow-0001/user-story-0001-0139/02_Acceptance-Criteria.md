# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0139-01
# Parent: US-0001-0139
Scenario: Aggregate-dir mirror with underscore casing (OQ-0110 Option A)
  Given a converged iter with N declared screens,
  When `iterate` mirrors accepted-iter content,
  Then `.qfai/evidence/prototyping/screenshots/<screen-id>.png` AND `.qfai/evidence/prototyping/html/<screen-id>.html` MUST exist for every `screens[]` entry.
  And screen-id casing MUST be normalised to underscore form end-to-end (iterate emit → validator expectation → contract `screens[].id` → aggregate-dir filename); hyphen-form is rejected at validate time.
```
