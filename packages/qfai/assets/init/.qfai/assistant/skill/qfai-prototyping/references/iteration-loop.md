# Iteration Loop

## Phases

```text
[Build]   iteration NN: generate iter-NN/index.html under DESIGN.md tokens
[Review]  iteration NN: the reviewer operates Playwright and writes the reviews
[Ask]     iteration NN: the user confirms the prototype, or answers with a change
[Handoff] confirmed:    final/index.html + final/handoff.json
```

## Per-iteration files

```text
.qfai/prototype/iter-NN/index.html
.qfai/prototype/iter-NN/review.json
.qfai/prototype/iter-NN/UI-NNNN/<screen>.review.json
```

The reviewer writes one payload per `(UI contract, screen)` pair beside the
per-iteration `review.json` summary, from the first iteration on (schema:
`references/review-payload-schema.md`, aggregation rule:
`references/reviewer-prompt.md`). That holds for a single-contract run as much
as for a multi-contract one.

The reviewer operates Playwright live. A screenshot or HTML snapshot is an
additional input, taken only when someone needs it.

`progress.md` is one file for the whole run. The orchestrator appends a
one-line summary at the end of each iteration.

## When the loop ends

The loop ends when the user confirms the prototype. Until then each answer the
user gives runs another iteration. No score, finding count or command decides
that the loop is done, and a blocking finding still open at the confirmation is
named in the final report rather than holding the loop open.

## Best-of-history is gone

The latest iteration is always the one put to the user. Temporary regressions
are allowed; a leap backwards is a normal path to a breakthrough on the IA and
flow axes.

## Surface profile

`surface` (web/mobile/desktop/mixed) only affects how the reviewer opens the
prototype. It is neutral with respect to AI behavior.

## Contracts read

- UI-bearing contract set under `<contractsDir>/ui/`
- root `DESIGN.md`

## Produced after the loop

- `.qfai/prototype/final/index.html` and `.qfai/prototype/final/handoff.json`.
  See `handoff.md`.

## Brand identity

Root `DESIGN.md` is read-only for the loop. To change brand identity, edit
`DESIGN.md` and start a new lineage through `prototyping-recover`: iterations
built against the old tokens are not reviewed against the new ones.
