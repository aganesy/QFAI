# Evaluation Layer: Aggregate

## Layer Classification

- Layer: aggregate
- Source: Weighted composite of all layer scores

## Purpose

This file defines how scores from invariant, trend-derived, and product-specific layers are combined into a single aggregate score for option comparison and decision-making.

## Layer Weight Distribution

| Layer            | Default Weight | Rationale                          |
| ---------------- | -------------- | ---------------------------------- |
| Invariant        | 60%            | Universal UX principles            |
| Trend-derived    | 25%            | Research-backed emerging standards |
| Product-specific | 15%            | Domain-unique requirements         |

## Scoring Guide

- 5: Aggregate score >= 4.5 (accept with confidence)
- 4: Aggregate score 3.5-4.4 (accept)
- 3: Aggregate score 2.5-3.4 (refine)
- 2: Aggregate score 1.5-2.4 (pivot recommended)
- 1: Aggregate score < 1.5 (reject)

## Trend-derived Axes

<!-- Add trend-derived axes below. Each requires source_translation from research findings. -->

- criterion: (trend-derived axis name); source_translation: (research finding → evaluation criterion); description: (description); weight: (weight)

## Product-specific Axes

<!-- Add product-specific axes below. These are unique to the project's domain. -->

- criterion: (project-specific axis name); description: (description); weight: (weight)

## Aggregate Scoring Rules

| Element       | Value                                            |
| ------------- | ------------------------------------------------ |
| Weights       | Invariant: 60%, Trend-derived: 25%, Product: 15% |
| Normalization | Linear 1-5 scale per axis, weighted sum          |
| Thresholds    | Accept >= 3.5, Refine 2.5-3.4, Pivot < 2.5       |
| Stopping      | Stop when all axes scored and aggregate computed |
