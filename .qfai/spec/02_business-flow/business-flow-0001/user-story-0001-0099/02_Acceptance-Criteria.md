# Acceptance Criteria

## Criteria

```gherkin
Feature: Design System As Input

# AC-0001-0099-01
# Parent: US-0001-0099
Scenario: Design System Read From DESIGN.md
  Given a UI implementation after the prototyping loop
  When `/qfai-implement` reads token tables
  Then it reads them from root `DESIGN.md` (color / typography / radius / shadow), the file the loop hashed at cycle 0, and no copy of them exists to drift from it.
```
