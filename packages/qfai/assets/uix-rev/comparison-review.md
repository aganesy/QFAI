# UIX-REV: Comparison Review

Review option comparison and selected anchor screen as independent artifacts.

## Comparison Quality (30_option_comparison.md)

- Must contain at least 2 options with structured evaluation
- Each option should have pros/cons/trade-off analysis
- Evaluation criteria must reference the 3-layer evaluation family
- Rejected/deferred options must have explicit rationale
- Reconsideration conditions must be documented for deferred options

### Trend-derived conversion check

- Trend scan results are converted to comparison axes
- Stale / overused AI slop avoidance is reflected in comparison criteria

## Selected Direction Quality (31_selected_anchor_screen.md)

- `selected_option` must reference one of the compared options in `30_option_comparison.md`
- `why_selected` must provide rationale aligned with 3-layer evaluation family
- Anchor screen must represent the canonical visual direction
- Downstream strategy (`10_implementation_strategy.md`) must align with selected direction
- Downstream contracts (`40_screen_contracts.md`) must be consistent with selected direction
- Deferred options must document reconsideration conditions

### Trend-derived conversion check

- Trend scan results are reflected in selected direction rationale
- Stale / overused AI slop avoidance is reflected in selection
