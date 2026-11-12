# Acceptance Criteria

## Criteria

```gherkin
Feature: Warn on an oversized Mermaid diagram

  # AC-0001-0240-01
  Scenario: Warn on a diagram over the budget
    Given a Mermaid diagram in the story tree with more nodes or more edges than the budget
    When I run qfai validate
    Then a warning names the file, the line of the diagram's opening fence, both counts and both limits, and tells the author to split the diagram

  # AC-0001-0240-02
  Scenario: Stay silent within the budget
    Given every Mermaid diagram has no more nodes and no more edges than the budget
    When I run qfai validate
    Then no diagram size warning is raised

  # AC-0001-0240-03
  Scenario: Take the budget from the configuration
    Given qfai.config.yaml sets the node and edge limits of the diagram budget
    When I run qfai validate
    Then the warning uses those limits instead of 12 nodes and 16 edges
```
