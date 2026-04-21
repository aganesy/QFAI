# L2 Review Guide

L2 checks product experience and design alignment.

## Inputs

- screenshots
- HTML snapshots
- evaluation family `20/21/22/23`
- selected anchor screen
- design system checklist
- previous iteration score

## 3-layer evaluation family

L2 must explicitly use all of:

- invariant axes (`20_design_eval_invariant.md`)
- trend-derived axes (`21_design_eval_trend_derived.md`)
- product-specific axes (`22_design_eval_product_specific.md`)
- aggregate rules (`23_design_eval_aggregate.md`)

## Required checks

- visual hierarchy aligns with invariant axes
- trend-based styling aligns with trend-derived axes
- product-specific differentiation is visible
- selected anchor direction is reflected in the current UI
- design system checklist is respected
- experience findings are recorded separately from blocking L1 findings

## Output

Return:

- per-axis findings
- revise/manual-review classification
- a numeric score per axis in the range `0.0..1.0`
- rationale tied to screenshot/HTML evidence and axis refs
