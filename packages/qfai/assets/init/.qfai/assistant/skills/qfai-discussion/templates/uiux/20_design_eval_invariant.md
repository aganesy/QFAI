# Evaluation Axis: Usability

## Layer Classification

- Layer: invariant
- Source: Universal UX heuristic (Nielsen)

## Evaluation Criteria

| Criterion        | Description                                      | Weight |
| ---------------- | ------------------------------------------------ | ------ |
| Learnability     | Time to complete core tasks for first-time users | High   |
| Efficiency       | Steps required for frequent operations           | High   |
| Error prevention | Safeguards against user mistakes                 | Medium |
| Recovery         | Ease of recovering from errors                   | Medium |

## Measurement Approach

| Metric               | Method                   | Target             |
| -------------------- | ------------------------ | ------------------ |
| Task completion rate | Usability test (5 users) | >= 90%             |
| Error rate           | Observation during tasks | <= 10%             |
| Time on task         | Stopwatch measurement    | <= baseline \* 1.2 |

## Scoring Guide

- 5: Exceeds all targets with measurable margin
- 4: Meets all targets
- 3: Meets most targets with minor gaps
- 2: Significant gaps in multiple criteria
- 1: Fails most criteria

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
