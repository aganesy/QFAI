# Option Comparison

## Purpose

Compare 2+ design options against scoring axes to support direction selection.

## Comparison Matrix

### Invariant Axes

| axis_id | axis_name | layer     | Option A: [Name] | Option B: [Name] | rationale   |
| ------- | --------- | --------- | ---------------- | ---------------- | ----------- |
| INV-01  | [name]    | invariant | [score 1-5]      | [score 1-5]      | [rationale] |
| INV-02  | [name]    | invariant | [score 1-5]      | [score 1-5]      | [rationale] |

### Trend-derived Axes

| axis_id | axis_name | layer         | Option A: [Name] | Option B: [Name] | rationale          |
| ------- | --------- | ------------- | ---------------- | ---------------- | ------------------ |
| TRD-01  | [name]    | trend-derived | [score 1-5]      | [score 1-5]      | [source + reason]  |

### Product-specific Axes

| axis_id | axis_name | layer            | Option A: [Name] | Option B: [Name] | rationale   |
| ------- | --------- | ---------------- | ---------------- | ---------------- | ----------- |
| PRD-01  | [name]    | product-specific | [score 1-5]      | [score 1-5]      | [rationale] |

## Aggregate Scoring

| Option   | Weights                               | Normalized Total | Threshold             | Rank   |
| -------- | ------------------------------------- | ---------------- | --------------------- | ------ |
| Option A | Invariant: 60%, Trend: 25%, Prod: 15% | [total]          | [accept/refine/pivot] | [rank] |
| Option B | Invariant: 60%, Trend: 25%, Prod: 15% | [total]          | [accept/refine/pivot] | [rank] |

## Selected Direction

Selected: [Option X] — [rationale for selection based on scores and constraints]

## Cross-references

- 3-layer evaluation files: `20_design_eval_invariant.md`, `21_design_eval_trend_derived.md`, `22_design_eval_product_specific.md`, `23_design_eval_aggregate.md`
- 3-layer model & aggregate rules: `23_design_eval_aggregate.md` (Aggregate Scoring Rules section)
- Selected direction is embedded in this file (see Selected Direction section above)
