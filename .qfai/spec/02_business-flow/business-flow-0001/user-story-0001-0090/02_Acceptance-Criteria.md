# Acceptance Criteria

## Criteria

```gherkin
Feature: Design Direction Handoff

# AC-0001-0090-01
# Parent: US-0001-0090
Scenario: Design direction recorded for /qfai-sdd
  Given a `/qfai-discussion` run whose classified surfaces, primary or secondary, include `web`, `mobile`, `desktop` or `mixed`
  When the discussion pack is finalized
  Then `01_Context.md#Design Direction` names the adopted theme and who chose it
  And discussion writes no root `DESIGN.md`

# AC-0001-0090-02
# Parent: US-0001-0090
Scenario: /qfai-sdd authors root DESIGN.md from the recorded direction
  Given a UI-bearing flow on a visual prototyping surface whose discussion pack is its source
  When `/qfai-sdd` writes the flow's design contracts
  Then it authors root `DESIGN.md` from the brand direction `01_Context.md#Design Direction` records
  And when the pack records no brand direction, it asks for one rather than choosing a brand itself
```
