# Iteration Loop

## Contents

- Phases
- Per-iteration files
- When the loop ends
- First-iteration variants
- Best-of-history is gone
- Restyle iterations
- Surface profile
- Contracts read
- Produced after the loop
- Brand identity

## Phases

```text
[Build]   iteration NN: generate iter-NN/index.html under DESIGN.md tokens
          (an open direction's first iteration: two or three variants)
[Review]  iteration NN: the reviewer operates Playwright and returns the reviews
[Ask]     iteration NN: the user confirms the prototype, or answers with a change
[Handoff] confirmed:    final/index.html + final/handoff.json (restyle: handoff.json only)
```

## Per-iteration files

```text
.qfai/prototype/iter-NN/index.html
.qfai/prototype/iter-NN/review.json
.qfai/prototype/iter-NN/UI-NNNN/<screen>.review.json
```

The session agent writes the reviewer's payload for each `(UI contract, screen)` pair beside the
per-iteration `review.json` summary, from the first iteration on (the payload schema and the aggregation rule are
in the reviewer references the loop step names). That holds for a single-contract run as much
as for a multi-contract one. A scoped run writes payloads only for the pairs it
reviews: its in-scope and render-check screens. An iteration with variants
writes them per variant, as First-iteration variants below says.

The reviewer operates Playwright live. A screenshot or HTML snapshot is an
additional input, taken only when someone needs it.

`progress.md` is one file for the whole run. The session agent appends a
one-line summary at the end of each iteration.

## When the loop ends

The loop ends when the user confirms the prototype. Until then each answer the
user gives runs another iteration. No score, finding count or command decides
that the loop is done, and a blocking finding still open at the confirmation is
named in the final report rather than holding the loop open. A restyle whose
audit found nothing to fix, and whose refinements the user declined, stops
before iteration 00 with no edit.

## First-iteration variants

A `prototype` run has an open direction when neither
`.qfai/prototype/grilling.md` `## Session` nor the root `DESIGN.md` settles
which layout carries the in-scope screens' task. An `## Escalated` row settles
nothing, and a feel left open alone does not open it: variants differ in
structure. The run's first iteration then builds two or three variants, `A`,
`B` and optionally `C`, of the in-scope screens. They differ in grouping,
layout or navigation, not only in style, all under the root `DESIGN.md`
tokens, on one `iter-NN/index.html`, switchable in place through
`?variant=<id>`. The session agent records the IDs as `variants` in
`progress.md` before the iteration is built, and sets `variants` to `none`
before the next one.

A `restyle` loop, a run with a `runScope`, a run whose `## Session` or
`DESIGN.md` settles the layout, and a run under a no-question mode, where
nobody can pick, record `variants` `none` and build one prototype.

Each variant is reviewed on its own, by a reviewer started fresh for it at
`<url>/iter-NN/?variant=<id>`, and its files take the place of the
iteration's:

```text
.qfai/prototype/iter-NN/variant-<id>/review.json
.qfai/prototype/iter-NN/variant-<id>/<ui-contract-id>/<screen>.review.json
```

The variants exist to make the choice answerable; they do not make it. The
user picks one, combines parts or rejects all, and the next iteration builds
one prototype from that answer. A compare reply whose `keep from` line names
another variant is a combination, not a pick. Its prior review is the picked variant's
summary, or none after a combination or a rejection. Every later read of the
variant iteration's review, as the review before the prior one or as
`previousScore`, reads the same. Every later iteration builds one prototype.

## Best-of-history is gone

The latest iteration is always the one put to the user. Temporary regressions
are allowed; a leap backwards is a normal path to a breakthrough on the IA and
flow axes. The variants of a first iteration are one iteration, not a history
to reach back to.

## Restyle iterations

A loop whose `progress.md` records `iterationKind` `restyle` restyles the
live app in place. Each `iter-NN/index.html` lists the live routes in scope,
the reviewer drives those routes in the running app, and the handoff is a
short form that names the routes and the stylesheet and motion entry points.
Before iteration 00, the loop step saves each route's text as a baseline and
audits the routes to set `restyleLevel`.

## Surface profile

`surface` (web/mobile/desktop/mixed) only affects how the reviewer opens the
prototype. It is neutral with respect to AI behavior.

## Contracts read

- UI-bearing contract set under `<contractsDir>/ui/`
- root `DESIGN.md`

## Produced after the loop

- `.qfai/prototype/final/index.html` and `.qfai/prototype/final/handoff.json`
  (restyle: `handoff.json` only).
  The `prototyping-handoff` step defines its fields.

## Brand identity

Root `DESIGN.md` is read-only for the loop. To change brand identity, edit
`DESIGN.md`; the next iteration is built and reviewed against the new tokens.
