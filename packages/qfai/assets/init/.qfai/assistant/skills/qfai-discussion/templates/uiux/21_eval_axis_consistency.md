# Evaluation Axis: Consistency

## Evaluation Criteria

| Criterion               | Description                                   | Weight |
| ----------------------- | --------------------------------------------- | ------ |
| Visual consistency      | Adherence to design tokens and spacing system | High   |
| Interaction consistency | Similar actions produce similar results       | High   |
| Terminology consistency | Same concepts use same labels throughout      | Medium |
| Platform conventions    | Follows platform-specific patterns            | Medium |

## Measurement Approach

| Metric            | Method                                   | Target                    |
| ----------------- | ---------------------------------------- | ------------------------- |
| Token compliance  | Automated audit (design token drift)     | 0 raw values              |
| Label audit       | Manual review of all user-facing strings | 0 inconsistencies         |
| Pattern deviation | Component usage review                   | <= 2 justified deviations |

## Scoring Guide

- 5: Zero deviations from design system
- 4: Minor deviations with documented rationale
- 3: Some deviations, all justified
- 2: Multiple unjustified deviations
- 1: No consistent design system applied
