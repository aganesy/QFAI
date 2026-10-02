# Acceptance Criteria

## Criteria

```gherkin
Feature: Frozen stock-photo license catalog
  # AC-0001-0122-01
  Scenario: Cycle-0 freezes the stock-photo license catalog
    Given cycle 0 runs with the accepted stock-photo sources and license tiers
    When it completes
    Then cycle-0 evidence persists the chosen license catalog and attribution format
    And every subsequent cycle reads that frozen catalog for license verification
```
