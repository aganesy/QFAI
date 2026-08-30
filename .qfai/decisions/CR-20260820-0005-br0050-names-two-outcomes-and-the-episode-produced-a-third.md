# Change Request

- ID: `CR-20260820-0005`
- Title: `BR-0017-0050 names two outcomes for a flakier higher value, and the episode that occurred produced a third`
- Raised by: `/qfai-implement orchestrator, spec-0017 TDD-0066; raised after the episode was resolved, not while proposing one`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — the third outcome is added to the rule, investigation first
- Applied at: `2026-08-23T00:00:00Z` — BR-0017-0050 and EX-0017-0050 rewritten; the retry-loop prohibition kept in all three branches
- Superseded by: `-`
- Blocked set: `none — TDD-0066 is implemented and records what happened; what is open is whether the rule names it`

## The rule, and the two outcomes it allows

`BR-0017-0050`: "When the higher setting measures slower or flakier, the lower setting MUST be kept and
the measurement recorded as the reason."

`EX-0017-0050` restates it: "The lower setting is kept and the measurement is recorded as the reason. A
regression is a recorded outcome, not the start of a retry loop."

So the rule contemplates two paths after a flakiness measurement: keep the lower value with the reason
recorded, or start a retry loop — and it forbids the second.

## What actually happened

The declared value of ten measured flakier. Fourteen logical CPUs, one variable changed per row:

```text
the failing file alone                     10 passed      (not broken)
integration slice, workers 10, conc 10      3 timeouts    (reproduced twice)
integration slice, workers 10, conc 5       3 timeouts    (not the concurrency axis)
integration slice, workers 4,  conc 5     862 passed      (the worker axis)
```

A revision of the declared value was proposed and put to the user, because `BR-0017-0051` reserves it.
The user refused the proposal **and its framing**: ten is mandatory, and the instruction was to correct
the structure that creates the contention rather than the number that exposes it.

That turned out to be right. The cause was not contention for a lock or a path but VOLUME, almost all of
it repeated: the failing describe called its fixture builder once per `it()`, three times, for fixtures
its own comment described as identical — roughly eighty-four git process spawns to build one fixture set
three times. Memoizing the result took the file from 22.90s to 5.49s, and the slice passes at ten.

So the outcome was: **the higher value was kept, unchanged, and the measured flakiness was removed by
fixing what produced it.**

## Why that is worth a rule change rather than a note

The rule as written cannot describe this. Recording it as compliance with `BR-0017-0050` would be false —
no lower setting was kept. Recording it as a violation would be worse, because the rule's PURPOSE, do not
paper over flakiness, was served more completely than its letter asks: the flakiness is gone rather than
avoided.

The practical risk is the next agent. It will read "the lower setting MUST be kept", measure flakiness,
and lower the value — which is the outcome this episode shows is often the wrong one, and which
`BR-0017-0051` separately forbids it from choosing. The two rules together currently push toward asking
the user to approve a reduction, when the better first move is to find out what is actually contending.

## Options

**A — add the third outcome to `BR-0017-0050`, ordered (recommended).** "When the higher setting measures
slower or flakier, the contended structure MUST be investigated first; if the contention is inherent, the
lower setting is kept and the measurement recorded as the reason." That makes the investigation the
default and the reduction the fallback, which is the order this episode found to be correct — and it
leaves the retry-loop prohibition untouched.

**B — leave the rule and record the divergence per episode.** What `DR-0017-0009` does today. Cheap, and
it relies on the next agent reading a decision record before acting on a business rule, which is not the
order they are written to be read in.

**C — treat the structural fix as out of scope for the rule.** Defensible: the rule is about adopting
values, not about test hygiene. But then a flakiness measurement has no path that leads to a fix, only to
a smaller number.

## A note on what this does not ask for

Nothing here revisits the declared value. It is ten, the user's instruction is on record, and
`DR-0017-0009` carries the measurement and the refusal. This CR is about the rule text a future reader
will follow.

## Related

- `BR-0017-0030`, `BR-0017-0031`, `BR-0017-0048`, `BR-0017-0050`, `BR-0017-0051`
- `AC-0017-0028`, `EX-0017-0050`, `EX-0017-0051`, `TC-0017-0066`, `TC-0017-0067`
- `DR-0017-0009`, `packages/qfai/vitest.knobs.ts`,
  `packages/qfai/tests/integration/shippedWorkflowDetection.test.ts`

## Impact

- Specs: `spec-0017 — BR-0017-0050 and EX-0017-0050`
- Plans: `none`
- Tests: `TDD-0066 and TDD-0067 record the episode and the sign-off question`
- Contracts: `none`
- Schema: `none`

## Decision needed from user

Take option A — add the third outcome to `BR-0017-0050` in order, making investigation of the
contended structure the default and the reduction the fallback, with the retry-loop prohibition
untouched — or option B, leaving the rule and recording each divergence per episode, or option C,
treating the structural fix as outside the rule?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: add the third outcome to `BR-0017-0050` and mirror it in
   `EX-0017-0050`, ordered so the investigation comes first and the reduction is the fallback.
   Mode: **`re-derive`**. A third outcome is added to the rule and mirrored in the example;
   neither exists to be confirmed.
2. Downstream ledger sweep: **no rows are reset.** `TDD-0066` is implemented and records what
   happened, including the refused proposal and the structural fix; `TDD-0067` records the sign-off
   question. Named so a later sweep cannot widen:
   - not reset: `TDD-0066`, `TDD-0067`
3. Cross-check after applying: the rule must not become readable as authorising a retry loop. The
   distinction to preserve is that the third outcome fixes the CAUSE of the flakiness, while a retry
   loop re-runs the same structure hoping for a different result.

## Resolution

<!--
Filled in when Status leaves `open`. Record the amended rule text and the example that mirrors it.
-->
