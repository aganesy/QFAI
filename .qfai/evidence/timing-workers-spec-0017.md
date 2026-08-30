# Worker-setting timing artifact — spec-0017

The comparison `BR-0017-0049` requires, and the value it places. `EX-0017-0049` fixes the shape:
"A timing artifact comparing at least two worker settings on the largest project, plus the value
actually adopted", accepting when "the adopted setting is the fastest measured, or within ten
percent of it with a written reason. A value adopted against no comparison does not satisfy the
rule."

`TC-0017-0065` reads this file and **re-does its arithmetic**. Nothing here is trusted for being
written down: the ten-percent relation is computed from the table below, the adopted value is
checked against `packages/qfai/vitest.knobs.ts`, and the project size is re-counted by walking the
directory. A wrong number in this file fails that row rather than surviving in it.

## Which project, and why that one

Largest project: `core` (1587 tests). Measured, not assumed — every runner project listed on the
same machine, same commit:

```text
core         1587 tests   122 test files
integration   862 tests   123 test files
e2e           903 tests    23 test files
validators    351 tests    46 test files
cli           321 tests    11 test files
unit          266 tests    43 test files
scripts       135 tests    10 test files
```

`core` is the largest by test count. `integration` has one more FILE and roughly half the cases,
which is why the count is stated in both units: file count is what the row re-checks (a directory
walk costs milliseconds, and spawning the runner from a test is the cost that put this spec's own
integration slice past its timeout), and case count is what "largest" is judged on.

test files: 122

## The comparison

Machine: 14 logical CPUs. Command: `QFAI_TEST_MAX_WORKERS=<n> pnpm -C packages/qfai test:core`,
one full run per setting, `Duration` as vitest reports it.

| workers | duration | vs fastest | tests                     |
| ------- | -------- | ---------- | ------------------------- |
| 4       | 132.94s  | —          | 1587 passed \| 2 skipped  |
| 10      | 134.07s  | +0.85%     | 1587 passed \| 2 skipped  |
| 14      | 135.62s  | +2.02%     | 1587 passed \| 2 skipped  |

adopted: 10

Fastest measured: 4 workers at 132.94s. The adopted value of 10 is **0.85% slower**, inside the ten
percent `EX-0017-0049` allows, so the accepting condition is the second one and a written reason is
required.

## Reason for not adopting the fastest

The value is the user's, given as an instruction: **ten is mandatory**, and when a measurement made
ten look flakier the instruction was to correct the structure that creates the contention rather
than the number that exposes it. `DR-0017-0009` records that episode, including the proposal to
lower the value and its refusal; `BR-0017-0051` reserves the choice of starting value to the user in
the first place, so adopting 4 on the strength of this table is not a decision this row may take.

The table also argues against caring. The full spread from 4 to 14 workers is **2.7 seconds on a
133-second run — about 2%** — so `core` is not worker-bound at all: its cost is dominated by
per-file transform and collect, which every setting pays. Adopting the fastest value here would buy
1.1 seconds and cost the ability to run ten-way, which is what the parallelism work exists to
enable.

What this table does NOT say, because the measurement was not taken: that 10 is the right value for
every project. It compares settings on the largest one, which is what the rule asks for.
`BR-0017-0053` governs per-project tuning and requires one project per pull request behind three
green verdict runs — `TDD-0069` owns that and is not satisfiable until this branch has verdict runs
to quote.

## Provenance

One run per setting, not a best-of-three. Recorded as a limitation rather than smoothed over: the
three durations differ by less than the run-to-run variance this repository has already shown
elsewhere in this spec's evidence, so the ORDER of the three rows is not established by this data —
only the magnitude of the spread, which is the fact the reason above rests on. A best-of-three would
change nothing about the conclusion and is the obvious improvement if the ten-percent margin ever
gets close.
