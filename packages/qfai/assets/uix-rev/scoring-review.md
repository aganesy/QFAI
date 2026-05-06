# UIX-REV: Scoring Review

Review exploration rubric and evaluator calibration for canonical completeness.

## Required Rubric Dimensions

The rubric must include:

1. `Design Quality`
2. `Originality`
3. `Craft`
4. `Functionality`

## Evaluation Axes Quality

- The rubric must be gradable and skeptical, not generic praise
- Design Quality and Originality must create positive pressure against bland outputs
- Craft and Functionality must operate as floors, not style-dominant constraints
- Evaluator calibration must include good critique, too-lenient critique, blandness fail, and originality fail examples

## Aggregate Scoring Rules

### Harness check

- Plateau / breakthrough conditions are explicitly documented downstream
- Later iterations are not automatically preferred over stronger earlier ones
- Breakthrough branches are judged against the incumbent with best-of-history handling

## Aggregate Review Focus

- Review rubric pressure, floor conditions, and calibration quality as a single system
- Remove old evaluation-axis vocabulary and keep wording aligned with the four canonical UX axes (information architecture / navigation flow / usability / functionality) fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`
