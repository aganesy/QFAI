# Acceptance Criteria

## Criteria

```gherkin
Feature: DESIGN.md Draft Authoring

# AC-0001-0090-01
# Parent: US-0001-0090
Scenario: DESIGN.md draft as discussion phase output
  Given a `/qfai-discussion` UI-bearing run completes,
  When the discussion pack is finalized,
  Then root `DESIGN.md` exists at the consuming-project root with required token tables (color / typography / radius / shadow) parseable per the design-md reference under the active design contracts of this spec's discussion deliverables.
```
