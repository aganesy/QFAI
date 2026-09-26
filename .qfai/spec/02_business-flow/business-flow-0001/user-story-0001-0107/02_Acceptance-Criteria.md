# Acceptance Criteria

## Criteria

```gherkin
Feature: One bounded prototype lineage

# AC-0001-0107-01
# Parent: US-0001-0107
Scenario: Evolve one prototype through a bounded serial loop
  Given a prototyping invocation begins at cycle 0
  When the prototype is revised after each review
  Then cycles form one serial lineage with indices 0 through at most 9
  And the run does not create parallel candidate lineages or select a best historical iteration
```
