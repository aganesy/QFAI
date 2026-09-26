# Acceptance Criteria

## Criteria

```gherkin
Feature: Choose how much the entry does

# AC-0001-0199-01
# Parent: US-0001-0199
Scenario: off and shadow write nothing
  Given `workflow.mode` set to `off` or `shadow`
  When a free-text change request arrives
  Then `start` writes nothing and returns the mode with no run
  And under `shadow` the route and its reason are proposed
  And under `off` the stage skills are invoked by name as today

# AC-0001-0199-02
# Parent: US-0001-0199
Scenario: An absent mode means active and an invalid one is refused
  Given `qfai.config.yaml` with no `workflow.mode`, or with a value outside the three
  When `start` is called
  Then an absent key runs `active`
  And an invalid value is refused `fail-closed` with cause `invalid-mode` and a config issue, and no mode is guessed

# AC-0001-0199-03
# Parent: US-0001-0199
Scenario: A fail-closed cause stops automatic chaining
  Given `active` mode
  When an invariant violation, an unsupported capability or policy drift is found
  Then found at `start`, the start is refused and no run exists
  And found later, automatic chaining stops until `resume` finds the cause cleared or the run is stopped
  And a routing override that keeps every required role is not drift
```
