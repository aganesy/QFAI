# uiux/ Sidecar Index

## Purpose

Manifest of all UI/UX sidecar artifacts produced during a UI-bearing discussion.

## File Inventory

| File                                | Purpose                                 | Required |
| ----------------------------------- | --------------------------------------- | -------- |
| 00_index.md                         | This manifest                           | Yes      |
| 10_strategy.md                      | Implementation strategy (YAML)          | Yes      |
| 11_design_taste_interview.md        | Design taste interview (10 sections)    | Yes      |
| 20_design_eval_invariant.md         | Invariant evaluation layer (3-layer)    | Yes      |
| 21_design_eval_trend_derived.md     | Trend-derived evaluation layer (3-layer)| Yes      |
| 22_design_eval_product_specific.md  | Product-specific evaluation layer (3-layer) | Yes  |
| 23_design_eval_aggregate.md         | Aggregate scoring layer (3-layer)       | Yes      |
| 24_design_eval_dynamic_overrides.md | Dynamic evaluation overrides            | Yes      |
| 30_comparison.md                    | Option comparison against scoring axes  | Yes      |
| 40_contracts.md                     | Screen interaction contracts            | Yes      |
| 50_review_bundle.md                 | Review input bundle                     | Yes      |

## Completeness Rule

All 11 files MUST be present for a UI-bearing pack. Partial generation is not permitted (BR-0026-0002).

## Migration Note

The following files from the legacy evaluation model are no longer part of the canonical family:

- `31_anchor.md` — replaced by `30_comparison.md`
- `60_critique_loop.md` — removed (critique integrated into review bundle)

Evaluation axis files now use the 3-layer model (invariant / trend-derived / product-specific) instead of the legacy axis naming.
