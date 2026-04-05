# Option Comparison

## Purpose

Compare 2–3 design options against 3-layer scoring axes to support direction selection.
Selected anchor details are in `31_selected_anchor_screen.md`.

## Comparison Matrix

### Invariant Axes

| axis_id | axis_name | layer     | Option A: [Name] | Option B: [Name] | rationale   |
| ------- | --------- | --------- | ---------------- | ---------------- | ----------- |
| INV-01  | [name]    | invariant | [score 1-5]      | [score 1-5]      | [rationale] |
| INV-02  | [name]    | invariant | [score 1-5]      | [score 1-5]      | [rationale] |

### Trend-derived Axes

| axis_id | axis_name | layer         | Option A: [Name] | Option B: [Name] | rationale         |
| ------- | --------- | ------------- | ---------------- | ---------------- | ----------------- |
| TRD-01  | [name]    | trend-derived | [score 1-5]      | [score 1-5]      | [source + reason] |

### Product-specific Axes

| axis_id | axis_name | layer            | Option A: [Name] | Option B: [Name] | rationale   |
| ------- | --------- | ---------------- | ---------------- | ---------------- | ----------- |
| PRD-01  | [name]    | product-specific | [score 1-5]      | [score 1-5]      | [rationale] |

## Aggregate Scoring

| Option   | Weights                               | Normalized Total | Threshold             | Rank   |
| -------- | ------------------------------------- | ---------------- | --------------------- | ------ |
| Option A | Invariant: 60%, Trend: 25%, Prod: 15% | [total]          | [accept/refine/pivot] | [rank] |
| Option B | Invariant: 60%, Trend: 25%, Prod: 15% | [total]          | [accept/refine/pivot] | [rank] |

## Per-Option Summary

### Option A: [Name]

- Strengths: [key strengths from scoring]
- Weaknesses: [key weaknesses from scoring]
- Risk: [key risks if selected]
- Defer reason: [why this option might be deferred, or N/A]

### Option B: [Name]

- Strengths: [key strengths from scoring]
- Weaknesses: [key weaknesses from scoring]
- Risk: [key risks if selected]
- Defer reason: [why this option might be deferred, or N/A]

## Cross-references

- 3-layer evaluation files: `20_design_eval_invariant.md`, `21_design_eval_trend_derived.md`, `22_design_eval_product_specific.md`, `23_design_eval_aggregate.md`
- 3-layer model & aggregate rules: `23_design_eval_aggregate.md` (Aggregate Scoring Rules section)
- Selected anchor & adoption rationale: `31_selected_anchor_screen.md`
