# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0119-01
# Parent: US-0001-0119
Scenario: Reviewer-driven Playwright session per spec × screen
  Given a per-cycle per-spec × screen evaluation (per UI contract × screen on the story tree),
  When the Reviewer sub-agent is invoked,
  Then the Reviewer itself launches Playwright (or equivalent harness), performs human-like operation (click / type / navigate / scroll) on the live prototype, and writes a single `<screen>.review.json`; no scripted interaction transcript file is produced and no AC selector / assertion is required.
```
