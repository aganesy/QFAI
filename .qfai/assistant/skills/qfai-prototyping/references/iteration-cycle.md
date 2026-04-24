# Iteration Cycle

## Phase taxonomy

Iterations must be classified as one of:

- `explore`
- `remix`
- `select`
- `polish`
- `branch`
- `reviewer_gate`
- `completed`

`select` is winner selection only. It does not count as post-selection polish and cannot be used as stage completion.

Each iteration follows this order:

1. Capture screenshot and HTML for every declared screen.
2. Launch L1 and L2 evaluator sub-agents with the required inputs.
3. Aggregate findings and classify them by severity and disposition.
4. Fix the UI according to findings.
5. Re-capture screenshot and HTML evidence for every changed screen.
6. Re-run the evaluators.

## Minimum iteration count

- Completion requires at least 2 iterations.
- A single successful-looking pass is not enough.
- If evidence is missing in any iteration, that iteration does not count as complete.
- Completion requires at least one `polish` iteration after winner selection.
- Each post-selection `polish` iteration must include critique, fix, re-capture, re-review, and breakthrough check evidence.
- Completion requires every reviewer sub-agent to score every evaluation axis at `100/100`.
- A 95-point threshold is a quality signal only and is not a completion border.

## Stop conditions

You may stop only when all of the following are true:

- all declared screens have screenshot + HTML evidence
- blocking findings are closed or dispositioned
- validate passes with `--fail-on error`
- independent reviewer returns `PASS`
- the completion certificate proves `allReviewerAxesPerfect100=true`
