# Acceptance Criteria

## Criteria

```gherkin
Feature: Cross-skill handoff legacy adapter helper

# AC-0001-0180-01
# Parent: US-0001-0180
Scenario: `qfai handoff upgrade` emits a conforming handoff losslessly
  Given a legacy handoff file (e.g. `session-handoff.yaml`),
  When `qfai handoff upgrade <legacy-file>` runs,
  Then it emits a conforming `handoff.yaml` (CLI-HANDOFF) at the canonical path and preserves all original fields under a `legacy:` key so no data is lost. SHOULD-level per the v1.9.1 `qfai prototyping upgrade-{config,json}` precedent (closed OQ-0120 / 0121).
```
