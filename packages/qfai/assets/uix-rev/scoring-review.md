# UIX-REV: Scoring Review

Review evaluator scoring quality against the four canonical UX axes
fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`.

## Required Evaluation Axes

The reviewer scores each iteration against these four axes (no
operator-authored rubric file is required or accepted):

1. `informationArchitecture`
2. `navigationFlow`
3. `usability`
4. `functionality`

## Evaluation Axes Quality

- Reviews must be gradable and skeptical, not generic praise
- `informationArchitecture` and `usability` must create positive pressure against bland outputs
- `navigationFlow` and `functionality` must operate as floors, not style-dominant constraints
- Reviewer prose must include good critique, too-lenient critique, blandness fail, and originality fail examples — calibration is enforced by reviewer-prompt content, not by a sidecar file

## Aggregate Scoring Rules

### Harness check

- Plateau / breakthrough conditions are explicitly documented downstream
- Later iterations are not automatically preferred over stronger earlier ones
- Breakthrough branches are judged against the incumbent with best-of-history handling

## Aggregate Review Focus

- Review axis pressure, floor conditions, and reviewer-prompt calibration quality as a single system
- Remove old evaluation-axis vocabulary; only the four canonical UX axes (information architecture / navigation flow / usability / functionality) fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` are valid
