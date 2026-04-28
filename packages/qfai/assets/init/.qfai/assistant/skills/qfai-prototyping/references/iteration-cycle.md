# Round Lifecycle

## Phase taxonomy

The exploration funnel is expressed as fixed rounds plus optional polish cycles:

- exploration rounds: `r5`, `r3`, `r2`, `r1`
- post-selection loops: `polish`, `branch`, `reviewer_gate`, `completed`

`r1` is winner selection only. It does not count as a post-selection polish cycle and cannot be used as stage completion.

## Round steps

Each exploration round follows this order, driven by the capture role plus evaluation reviewers:

1. **Round start**: run `qfai prototyping round-start --round <rN> --candidates <csv> --target-url <url> --mode <mode>`.
2. **Capture**: execute `command-plans.json` for every declared screen of every active candidate using the preflight-resolved Playwright CLI launcher, saving evidence at the assigned paths.
3. **Evaluate**: reviewer sub-agents read `review-bundle.json`; the orchestrator persists per-candidate `evaluator-reviews/<candidate-id>.json` with concrete `evidenceRefs[]`.
4. **Harvest**: run `qfai prototyping round-harvest --round <rN>` to create the harvest template from the evaluated candidate set.
5. **Narrow**: run `qfai prototyping round-narrow --round <rN> --survivors <csv>` to record which candidates survive to the next round.
6. **Absorb**: for `r3|r2|r1`, run `qfai prototyping round-absorb --round <rN> --survivors <csv>` to generate the absorption plan for the surviving candidates.
7. **Reimplement verify**: run `qfai prototyping round-reimplement-verify --round <rN>` after reimplementation evidence is written.
8. **Commit gate**: create a git commit for the completed round and record the resulting `commitSha` on the round entry in `prototyping.json` before starting the next round.

Round-specific commit points:

- `r5`: after 5 directions are generated, captured, evaluated, harvested, and narrowed to 3.
- `r3`: after the 3 surviving directions are improved/reimplemented, captured, evaluated, harvested, and narrowed to 2.
- `r2`: after the 2 surviving directions are improved/reimplemented, captured, evaluated, harvested, and narrowed to 1.
- `r1`: after winner selection and selected-direction/design-system extraction evidence are written.

Each post-selection `polish` or `branch` cycle has the same commit gate: after critique, fix, re-capture, re-review, and breakthrough check evidence are written, create a git commit and record that cycle's `commitSha` before continuing.

## Completion requirements

Completion (independent of mode) requires ALL of the following:

- at least one `polish` cycle completed after winner selection (capture + review + fix + re-capture + re-review)
- each exploration round and post-selection cycle has a unique recorded `commitSha`
- all declared screens have all 4 artifacts in the completion round / polish cycle
- blocking findings are closed or dispositioned
- `bestOfHistory` evidence present
- `breakthrough` evidence present
- every reviewer sub-agent scored every evaluation axis at `100/100`
- `qfai validate --profile prototyping --fail-on error` passes
- independent reviewer returns `PASS`
- the completion certificate proves `allReviewerAxesPerfect100=true`

## Mode invariant

The completion gate above applies identically to `low-cost`, `standard`, and `full-harness`. The only mode-specific value is `maxCycles`:

- `low-cost`: `maxCycles = 1` — at most one polish cycle; completion is only reachable if the single polish cycle satisfies the full gate.
- `standard`: `maxCycles = 3` — default.
- `full-harness`: `maxCycles = 20` — extended polish budget.

If the polish-cycle budget is exhausted before the gate is satisfied, the run does not complete and is returned as `REVISE`. A 95-point threshold is a signal only and is not a completion border.

## Stop conditions

You may stop only when all of the following are true:

- all declared screens have all 4 artifacts for the current accepted winner/polish state
- canonical latest paths match the current accepted winner/polish state
- blocking findings are closed or dispositioned
- `qfai validate --profile prototyping --fail-on error` passes
- independent reviewer returns `PASS`
- the completion certificate proves `allReviewerAxesPerfect100=true`
