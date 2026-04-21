# Iteration Cycle

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

## Stop conditions

You may stop only when all of the following are true:

- all declared screens have screenshot + HTML evidence
- blocking findings are closed or dispositioned
- validate passes with `--fail-on error`
- independent reviewer returns `PASS`
