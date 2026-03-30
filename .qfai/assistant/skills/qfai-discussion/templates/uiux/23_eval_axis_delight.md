# Evaluation Axis: Delight

## Layer Classification

- Layer: invariant
- Source: User satisfaction and perceived quality

## Evaluation Criteria

| Criterion              | Description                              | Weight |
| ---------------------- | ---------------------------------------- | ------ |
| Perceived performance  | UI feels responsive and snappy           | High   |
| Feedback quality       | Clear, helpful feedback for user actions | Medium |
| Progressive disclosure | Information revealed at the right moment | Medium |
| Aesthetic quality      | Visual polish and attention to detail    | Low    |

## Measurement Approach

| Metric              | Method                     | Target                       |
| ------------------- | -------------------------- | ---------------------------- |
| Perceived load time | User perception survey     | "fast" or "very fast" >= 80% |
| Feedback coverage   | Audit of state transitions | 100% have feedback           |
| Satisfaction score  | Post-task survey (1-5)     | >= 4.0                       |

## Scoring Guide

- 5: Users report delight; exceeds expectations
- 4: Smooth experience; meets expectations
- 3: Functional but unremarkable
- 2: Friction points noticed by users
- 1: Frustrating experience reported

## Trend-derived Axes

<!-- Add trend-derived axes below. Each requires source_translation from research findings. -->

| Criterion          | Source Translation                          | Description   | Weight   |
| ------------------ | ------------------------------------------- | ------------- | -------- |
| (trend-derived)    | (research finding → evaluation criterion)   | (description) | (weight) |

## Product-specific Axes

<!-- Add product-specific axes below. These are unique to the project's domain. -->

| Criterion          | Description   | Weight   |
| ------------------ | ------------- | -------- |
| (project-specific) | (description) | (weight) |

## Aggregate Scoring Rules

| Element        | Value                                                |
| -------------- | ---------------------------------------------------- |
| Weights        | Invariant: 60%, Trend-derived: 25%, Product: 15%     |
| Normalization  | Linear 1-5 scale per axis, weighted sum              |
| Thresholds     | Accept >= 3.5, Refine 2.5-3.4, Pivot < 2.5          |
| Stopping       | Stop when all axes scored and aggregate computed      |
