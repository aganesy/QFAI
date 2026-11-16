# Acceptance Criteria

## Criteria

```gherkin
Feature: Steer exploratory searches to the graph CLIs

  # AC-0001-0235-01
  Scenario: Name the graph CLIs first without blocking ordinary search
    Given the graph exploration rule qfai init ships
    When an agent reads it before searching, exploring or investigating
    Then it names the code and documents graph CLI commands as the first choice and says ordinary search is acceptable and no tool blocks it
```
