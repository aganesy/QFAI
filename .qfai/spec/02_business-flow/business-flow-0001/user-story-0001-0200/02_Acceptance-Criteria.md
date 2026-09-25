# Acceptance Criteria

## Criteria

```gherkin
Feature: Run only on a host that can carry the run

# AC-0001-0200-01
# Parent: US-0001-0200
Scenario: A host that cannot carry the run is refused at start
  Given an unknown host, or a capability report that declares a gap in the required set
  When `start` is called
  Then `start` is refused `unsupported-capability`
  And no run exists

# AC-0001-0200-02
# Parent: US-0001-0200
Scenario: A failed first delegation leaves the run blocked
  Given a run whose capability report passed
  When its first required delegation fails
  Then the run is `blocked` with the missing capability named
  And whether the release claims the host as supported changes nothing in this outcome
```
