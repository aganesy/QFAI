# Evaluation Axis: Consistency

## Layer Classification

- Layer: invariant
- Source: Design system adherence principle

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

## Trend-derived Axes

<!-- Add trend-derived axes below. Each requires source_translation from research findings. -->

| Criterion       | Source Translation                        | Description   | Weight   |
| --------------- | ----------------------------------------- | ------------- | -------- |
| (trend-derived) | (research finding → evaluation criterion) | (description) | (weight) |

## Product-specific Axes

<!-- Add product-specific axes below. These are unique to the project's domain. -->

| Criterion          | Description   | Weight   |
| ------------------ | ------------- | -------- |
| (project-specific) | (description) | (weight) |

## Aggregate Scoring Rules

| Element       | Value                                            |
| ------------- | ------------------------------------------------ |
| Weights       | Invariant: 60%, Trend-derived: 25%, Product: 15% |
| Normalization | Linear 1-5 scale per axis, weighted sum          |
| Thresholds    | Accept >= 3.5, Refine 2.5-3.4, Pivot < 2.5       |
| Stopping      | Stop when all axes scored and aggregate computed |
