# Evaluation Layer: Aggregate

## Layer Classification

- Layer: aggregate
- Source: Weighted composite of all layer scores

## Purpose

This file defines how scores from invariant, trend-derived, and product-specific layers are combined into a single aggregate score for option comparison and decision-making.

## Aggregate Scoring Rules

- total_score_formula: weighted_sum(invariant \* layer_weights.invariant, trend \* layer_weights.trend_derived, product \* layer_weights.product_specific)
- layer_weights:
  - invariant: 0.60
  - trend_derived: 0.25
  - product_specific: 0.15
- accept_threshold: 3.5
- refine_band: 2.5-3.4
- pivot_band: < 2.5
- max_iterations: [maximum number of refine iterations before escalation]
- plateau_rule: [rule for detecting score plateau across iterations, e.g., "3 consecutive iterations with delta < 0.1"]
- missing_score_policy: [how to handle axes with no score, e.g., "exclude from weighted sum and note in review"]
- disagreement_rule: [how to resolve disagreement between reviewers, e.g., "average scores, escalate if delta > 1.0"]

## Scoring Guide

- 5: Aggregate score >= 4.5 (accept with confidence)
- 4: Aggregate score 3.5-4.4 (accept)
- 3: Aggregate score 2.5-3.4 (refine)
- 2: Aggregate score 1.5-2.4 (pivot recommended)
- 1: Aggregate score < 1.5 (reject)

## Cross-references

- Invariant axes: `20_design_eval_invariant.md`
- Trend-derived axes: `21_design_eval_trend_derived.md`
- Product-specific axes: `22_design_eval_product_specific.md`
- Dynamic overrides (optional): `24_design_eval_dynamic_overrides.md`
- Option comparison: `30_option_comparison.md`
