# UIX-REV: Scoring Review

Review scoring-ready schema for canonical completeness.

## Per-Axis Required Fields

Each evaluation axis must include:

1. `axis_id` — unique identifier
2. `axis_name` — human-readable name
3. `layer` — invariant / trend-derived / product-specific
4. `origin` — derivation source (taste interview, trend scan, domain)
5. `intent` — what this axis measures
6. `why_it_matters` — rationale for inclusion
7. `score_anchors` — concrete definitions for `low`, `mid`, `high`
8. `positive_signals` — evidence that supports a high score
9. `negative_signals` — evidence that supports a low score
10. `anti_patterns` — patterns that should be flagged
11. `evidence_required` — what evidence is needed to score
12. `weight` — relative weight in aggregate scoring
13. `minimum_floor` — minimum acceptable score (optional)
14. `source_refs` — references to taste/trend sources
15. `goal_refs` — references to project goals
16. `review_questions` — questions the reviewer should ask

## Evaluation Axes Quality

- Each trend-derived row must include source_translation
- Axes must be measurable and verifiable
- No generic/boilerplate axes without taste/trend derivation

## Aggregate Scoring Rules

Canonical field names (must match `23_design_eval_aggregate.md`):

- `total_score_formula`: weighted composite formula
- `layer_weights`: per-layer weight allocation (must sum to 1.0)
- `accept_threshold`: minimum score for accept verdict (≥ 3.5)
- `refine_band`: score range for refine verdict (2.5–3.4)
- `pivot_band`: score range for pivot verdict (< 2.5)
- `max_iterations`: maximum scoring iterations
- `plateau_rule`: stagnation detection rule documented
- `missing_score_policy`: how to handle missing axis scores
- `disagreement_rule`: calibration disagreement handling documented

### Trend-derived conversion check

- Trend scan results are converted to scoring axes
- Trend scan results are reflected in selected direction
- Stale / overused AI slop avoidance is reflected in comparison and selection

## Aggregate Review Focus

- Review axis quality, overlap, and minimum floors as a single aggregate system
- Review `source_refs` and `goal_refs` linkage for every scored axis
- Remove old aggregate vocabulary and keep wording aligned with `23_design_eval_aggregate.md`
