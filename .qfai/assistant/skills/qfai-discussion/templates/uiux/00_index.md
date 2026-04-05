# uiux/ Sidecar Index

## Purpose

Manifest of all UI/UX sidecar artifacts produced during a UI-bearing discussion.

## File Inventory

| File                                | Purpose                                     | Required |
| ----------------------------------- | ------------------------------------------- | -------- |
| 00_index.md                         | This manifest                               | Yes      |
| 10_implementation_strategy.md       | Implementation strategy (canonical)         | Required |
| 11_design_taste_interview.md        | Design taste interview (10 sections)        | Yes      |
| 20_design_eval_invariant.md         | Invariant evaluation layer (3-layer)        | Yes      |
| 21_design_eval_trend_derived.md     | Trend-derived evaluation layer (3-layer)    | Yes      |
| 22_design_eval_product_specific.md  | Product-specific evaluation layer (3-layer) | Yes      |
| 23_design_eval_aggregate.md         | Aggregate scoring layer (3-layer)           | Yes      |
| 24_design_eval_dynamic_overrides.md | Dynamic evaluation overrides                | Optional |
| 30_option_comparison.md             | Option comparison against scoring axes      | Yes      |
| 31_selected_anchor_screen.md        | Selected anchor screen & direction decision | Yes      |
| 40_screen_contracts.md              | Screen interaction contracts (11 fields)    | Yes      |
| 50_review_input_bundle.md           | Review input bundle                         | Yes      |

## Completeness Rule

All required files (11 files) MUST be present for a UI-bearing pack. `24_design_eval_dynamic_overrides.md` is optional. Partial generation is not permitted (BR-0026-0002).

## Forbidden Legacy Files

The following files are NOT part of the canonical family and must NOT be created in new packs:

- `30_comparison.md` — replaced by `30_option_comparison.md`
- `31_anchor.md` — replaced by `31_selected_anchor_screen.md`
- `40_contracts.md` — replaced by `40_screen_contracts.md`
- `50_review_bundle.md` — replaced by `50_review_input_bundle.md`
- `60_critique_loop.md` — removed (critique integrated into review bundle)
- `20_eval_axis_usability.md` — replaced by 3-layer model
- `21_eval_axis_consistency.md` — replaced by 3-layer model
- `22_eval_axis_accessibility.md` — replaced by 3-layer model
- `23_eval_axis_delight.md` — replaced by 3-layer model
