# Review Input Bundle

## Purpose

Consolidate all sidecar artifacts into a review-ready bundle for design reviewers.

## Bundle Contents

| Artifact                   | Path                                       | Status                    |
| -------------------------- | ------------------------------------------ | ------------------------- |
| Strategy                   | `uiux/10_strategy.md`                      | [draft/reviewed/approved] |
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

## Review Checklist

- [ ] Strategy aligns with surface type and project constraints (strong 8-field schema)
- [ ] Taste interview covers all 10 sections with actionable preferences
- [ ] Trend freshness dates are recent and source translations are project-specific
- [ ] Anti-preference traceability (taste → evaluation criteria linkage)
- [ ] 3-layer evaluation axes defined with measurable criteria (invariant + trend-derived + product-specific)
- [ ] 2+ options compared against all axes in `30_option_comparison.md`
- [ ] Selected anchor clearly documented in `31_selected_anchor_screen.md` with rationale
- [ ] Rejected/deferred options documented with reasons
- [ ] Strategy decision clarity (chosen_option aligns with selected anchor)
- [ ] Screen contracts use the 11-field strong schema (screen_id, route, purpose, actor, primary_tasks, secondary_tasks, required_states, transitions, observable_outcomes, notes_for_verify, notes_for_reviewer)
- [ ] Screen contracts cover all 4 required states (default/loading/empty/error) and act as the required state SSOT
- [ ] `prototyping.yaml` `recommended_mode` is consistent with comparison / strategy / surface classification
- [ ] When `allowed_modes` exists, it includes `recommended_mode`
- [ ] Generic fallback risk: no design decisions rely on unvalidated assumptions
- [ ] All review findings addressed or deferred with rationale

## Reviewer Notes

<!-- Reviewer feedback is captured here during the review cycle. -->
