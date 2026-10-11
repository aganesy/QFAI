# Acceptance Criteria

## Criteria

```gherkin
Feature: Design Direction Handoff
  # AC-0001-0087-01
  Scenario: Design direction recorded for /qfai-sdd
    Given a `/qfai-discussion` run whose classified surfaces, primary or secondary, include `web`, `mobile`, `desktop` or `mixed`
    When the discussion pack is finalized
    Then `01_Context.md#Design Direction` names the adopted theme and who chose it
    And discussion writes no root `DESIGN.md`

  # AC-0001-0087-02
  Scenario: /qfai-sdd authors root DESIGN.md from the recorded direction
    Given a UI-bearing flow on a visual prototyping surface whose discussion pack is its source
    When `/qfai-sdd` writes the flow's design contracts
    Then it authors root `DESIGN.md` from the brand direction `01_Context.md#Design Direction` records
    And when the pack records no brand direction, it asks for one rather than choosing a brand itself

  # AC-0001-0087-03
  Scenario: SDD repairs only the authorized part of an existing design
    Given a visual flow with an existing root `DESIGN.md`
    And SDD triage names that path and the requested change
    And a new WIP change-request row authorizes that path and change
    When the SDD design-authoring step runs
    Then it applies only that change and validates the result
    And it preserves the existing brand and tokens unless their change is authorized and supported by recorded direction or named theme values

  # AC-0001-0087-04
  Scenario: An existing design without an authorized change is preserved
    Given a visual flow with an existing root `DESIGN.md`
    And no new WIP change-request row authorizes the triaged change to that path
    When the SDD design-authoring step runs
    Then it writes nothing to that file and validates it as it stands
    And an unreplaced sample is refused

  # AC-0001-0087-05
  Scenario: A CLI-only flow writes no visual design
    Given a flow classified only as CLI
    When the SDD design-authoring step runs
    Then it writes no root `DESIGN.md`
    And it leaves any existing file unchanged

```
