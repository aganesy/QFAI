# Acceptance Criteria

## Criteria

```gherkin
Feature: Repoint the host links and the ignore rules

# AC-0004-0011-01
# Parent: US-0004-0011
Scenario: The host integration links follow the singular directories
  Given a project whose host integration links point at the plural skill and agent directories
  When step 9 runs
  Then each link points at the singular directory
  And no other file changes and qfai init --force is not run

# AC-0004-0011-02
# Parent: US-0004-0011
Scenario: The managed .gitignore block matches the installed package's
  Given a project whose managed .gitignore block negates the plural decision-record directory
  When step 10 runs
  Then the managed block equals the one the installed package writes
  And git check-ignore reports no path under .qfai/evidence/decision/
```
