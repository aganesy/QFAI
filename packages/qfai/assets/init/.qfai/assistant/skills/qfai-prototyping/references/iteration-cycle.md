# Cycle (Iteration) Lifecycle

## Phase taxonomy

Cycles are classified as one of:

- `explore`
- `remix`
- `select`
- `polish`
- `branch`
- `reviewer_gate`
- `completed`

`select` is winner selection only. It does not count as a post-selection polish cycle and cannot be used as stage completion.

## Cycle steps

Each cycle follows this order, driven by the AI evaluator sub-agent running Playwright CLI:

1. **Prepare**: run `qfai prototyping prepare --target-url <url> --mode <mode> --cycle <n>` (or read existing review-bundle for the cycle).
2. **Capture**: execute the Playwright CLI command plan (goto, snapshot, interaction, screenshot, html) for every declared screen, saving evidence at the paths defined by the command plan.
3. **Evaluate**: the L1 and L2 evaluator sub-agents read `review-bundle.json` and score the cycle. Write `evaluator-review.json` with concrete `evidenceRefs[]`.
4. **Classify**: aggregate findings, mark blocking vs informational.
5. **Fix**: the generator sub-agent rewrites UI for blocking findings.
6. **Re-capture**: run the Playwright CLI command plan again for changed screens in cycle `n+1`.
7. **Re-evaluate**: run L1/L2 evaluators again on the fresh evidence.

## Completion requirements

Completion (independent of mode) requires ALL of the following:

- at least one `polish` cycle completed after winner selection (capture + review + fix + re-capture + re-review)
- all declared screens have all 4 artifacts in the completion cycle
- blocking findings are closed or dispositioned
- `bestOfHistory` evidence present
- `breakthrough` evidence present
- every reviewer sub-agent scored every evaluation axis at `100/100`
- `qfai validate --profile prototyping --fail-on error` passes
- independent reviewer returns `PASS`
- the completion certificate proves `allReviewerAxesPerfect100=true`

## Mode invariant

The completion gate above applies identically to `low-cost`, `standard`, and `full-harness`. The only mode-specific value is `maxCycles`:

- `low-cost`: `maxCycles = 1` — at most one cycle; completion is only reachable if the single cycle satisfies the full gate.
- `standard`: `maxCycles = 3` — default.
- `full-harness`: `maxCycles = 20` — extended exploration budget.

If the cycle budget is exhausted before the gate is satisfied, the run does not complete and is returned as `REVISE`. A 95-point threshold is a signal only and is not a completion border.

## Stop conditions

You may stop only when all of the following are true:

- all declared screens have all 4 artifacts for the current cycle
- canonical latest paths match the current cycle
- blocking findings are closed or dispositioned
- validate passes with `--fail-on error`
- independent reviewer returns `PASS`
- the completion certificate proves `allReviewerAxesPerfect100=true`
