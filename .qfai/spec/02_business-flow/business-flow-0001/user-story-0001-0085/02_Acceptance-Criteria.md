# Acceptance Criteria

## Criteria

```gherkin
Feature: Exploration Rubric
  # AC-0001-0085-01
  Scenario: Reviewer prompt distinguishes cycle scores from screen impressions
    Given the shipped reviewer prompt and per-screen review payload schema
    When a product-surface-reviewer completes a prototyping cycle
    Then the cycle summary reports informationArchitecture, navigationFlow, usability, and functionality using weak, acceptable, strong, or exceptional
    And each screen payload records its six required bounded impressions and blocking findings without an extra rating field
    And no discussion-pack rubric or calibration sidecar defines the axes
```
