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

- `weights`: defined for all axes, must sum to 1.0 (or be normalizable)
- `normalization`: method specified
- `threshold`: accept / refine / pivot boundaries defined
- `plateau`: stagnation detection rule documented
- `disagreement`: calibration disagreement handling documented
