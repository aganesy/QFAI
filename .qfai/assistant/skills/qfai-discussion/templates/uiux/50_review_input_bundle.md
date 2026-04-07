# Review Input Bundle

## Purpose

Consolidate all sidecar artifacts into a review-ready bundle for design reviewers.

## Bundle Contents

| Artifact                   | Path                                       | Status                    |
| -------------------------- | ------------------------------------------ | ------------------------- |
| Strategy                   | `uiux/10_implementation_strategy.md`       | [draft/reviewed/approved] |
| Taste interview            | `uiux/11_design_taste_interview.md`        | [draft/reviewed/approved] |
| Trend scan                 | `04_Sources.md#Trend Scan`                 | [draft/reviewed/approved] |
| Invariant layer            | `uiux/20_design_eval_invariant.md`         | [draft/reviewed/approved] |
| Trend-derived layer        | `uiux/21_design_eval_trend_derived.md`     | [draft/reviewed/approved] |
| Product-specific layer     | `uiux/22_design_eval_product_specific.md`  | [draft/reviewed/approved] |
| Aggregate layer            | `uiux/23_design_eval_aggregate.md`         | [draft/reviewed/approved] |
| Dynamic overrides          | `uiux/24_design_eval_dynamic_overrides.md` | [optional]                |
| Option comparison          | `uiux/30_option_comparison.md`             | [draft/reviewed/approved] |
| Selected anchor            | `uiux/31_selected_anchor_screen.md`        | [draft/reviewed/approved] |
| Screen contracts           | `uiux/40_screen_contracts.md`              | [draft/reviewed/approved] |
| Prototyping recommendation | `../prototyping.yaml`                      | [draft/reviewed/approved] |

## Trend-derived review focus

- Required trend categories are all present and complete.
- Stale / overused AI slop patterns are explicitly avoided.
- Trend research is translated into scoring, comparison, and selected anchor decisions.
- Scoring-ready axes use canonical fields: `origin`, `layer`, `source_refs`, `goal_refs`, `evidence_required`, `review_questions`.

## Review Checklist

- [ ] Strategy aligns with surface type and project constraints
- [ ] Trend categories are complete and translated into local design decisions
- [ ] Competitive references include adopted_points, rejected_points, and local_translation
- [ ] Scoring-ready axes expose canonical fields including origin/source_refs/goal_refs/evidence_required/review_questions
- [ ] Selected anchor clearly documents rationale and downstream implications
- [ ] Screen contracts cover all required states
