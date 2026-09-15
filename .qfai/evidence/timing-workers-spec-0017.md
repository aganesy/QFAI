# Worker-setting timing artifact — spec-0017

The comparison `BR-0017-0049` requires, and the value it places. `EX-0017-0049` fixes the shape:
"A timing artifact comparing at least two worker settings on the largest project, plus the value
actually adopted", accepting when "the adopted setting is the fastest measured, or within ten
percent of it with a written reason. A value adopted against no comparison does not satisfy the
rule."

`TC-0017-0065` reads this file and **re-does its arithmetic**. Nothing here is trusted for being
written down: the ten-percent relation is computed from the table below, the adopted value is
checked against `packages/qfai/vitest.knobs.ts`, and the project size is re-counted by walking the
directories the project collects from. A wrong number in this file fails that row rather than surviving in it.

## Which project, and why that one

Largest project: `e2e` (4180 tests). Measured, not assumed — every runner project enumerated on
the same machine, same commit, with `vitest list --json`. That pass lists the cases the runner would
select, which is the unit every row of the table below is in: a case the suite skips is declared and
not selected, so the runs further down report fifteen of them beside the 4180:

| project     | tests | files |
| ----------- | ----- | ----- |
| e2e         |  4180 |   198 |
| core        |  3371 |   174 |
| integration |  1538 |   158 |
| validators  |  1043 |    55 |
| cli         |  1012 |    36 |
| unit        |   850 |    77 |
| scripts     |   741 |    36 |

The two units are used for different things: case count is what "largest" is judged on, and file
count is what the row re-checks, because a directory walk costs milliseconds and spawning the
runner from a test is the cost that put this spec's own integration slice past its timeout.

The file counts are a walk of every directory the project's `include` names, which is not the same
as `tests/<project>` for two of them: `e2e` also collects `tests/assets/**`, and `integration`
three trees beside its own. Walking the project's own directory alone would have recorded 29 files
for `e2e` — a seventh of the project the comparison below was run on, with drift in the rest
invisible.

test files: 198

## The comparison

Machine: 14 logical CPUs. Command: `QFAI_TEST_MAX_WORKERS=<n> pnpm -C packages/qfai test:e2e`,
one full run per setting, `Duration` as vitest reports it.

| workers | duration | vs fastest | tests                                |
| ------- | -------- | ---------- | ------------------------------------ |
| 4       | 87.64s   | +20.05%    | 4177 passed \| 15 skipped \| 3 failed |
| 10      | 77.39s   | +6.01%     | 4177 passed \| 15 skipped \| 3 failed |
| 14      | 73.00s   | —          | 4177 passed \| 15 skipped \| 3 failed |

adopted: 10

The three failures are the same three in every run and they are a property of this working tree,
not of the setting: two count records and one claim count read the discussion packs on disk, and
this machine holds one pack the repository does not track. The same commit is green in CI. They are
reported here rather than smoothed away, and they cost the same time at every setting.

Fastest measured: 14 workers at 73.00s. The adopted value of 10 is **6.01% slower**, inside the ten
percent `EX-0017-0049` allows, so the accepting condition is the second one and a written reason is
required.

## Reason for not adopting the fastest

The value is the user's, given as an instruction: **ten is mandatory**, and when a measurement made
ten look flakier the instruction was to correct the structure that creates the contention rather
than the number that exposes it. `DR-0017-0009` records that episode, including the proposal to
lower the value and its refusal; `BR-0017-0051` reserves the choice of starting value to the user in
the first place, so adopting 14 on the strength of this table is not a decision this row may take.

**What the curve says.** On this project the wall clock falls as the setting rises, over a
14.64-second spread on a 73-second run, so the shape is a property of the project measured rather
than of the repository. The case for ten rests on the instruction and on the margin — 6.01%, 4.39
seconds — and anyone lowering the ten-percent allowance should read this table first.

## The same question on four cores

The table above was taken on fourteen logical CPUs, where ten forks fit. `ubuntu-latest` gives
four, and there the declared value asks for more forks than there are cores. Whole package suite,
four cores, one full run per setting, back to back on the same machine:

| machine    | forks | wall    | collect (summed) | tests (summed) |
| ---------- | ----- | ------- | ---------------- | -------------- |
| four cores | 10    | 307.4 s | 347.8 s          | 1999.2 s       |
| four cores | 4     | 253.0 s | 109.6 s          | 703.6 s        |

The collect and test figures are summed across forks, and their collapse is what the wall clock
understates: at ten forks on four cores most of each fork's measured time is spent waiting for a
core rather than working. Summed test time falls to a third while the same 11 338 cases run with
the same outcomes. The suite is not ten-way parallel on that machine; it only reports as though it
were. On the wall clock ten is 21.5% slower, well outside the ten percent `EX-0017-0049` allows,
where on fourteen cores it is 6.01%, inside it.

An independent pair of runs on the same core count gave 299 s and 269 s, a 11.2% spread. Both pairs
put ten outside the allowance and four ahead, so the conclusion does not rest on either one alone.

Deliberately in its own table. The rows above are one machine's comparison and the arithmetic
`TC-0017-0065` re-does; mixing a second machine's runs into them would make "fastest measured" a
number from no single machine.

**What this changed.** Not the declared value, which is still ten. `vitest.knobs.ts` now hands the
runner `Math.min(DECLARED_START, availableParallelism())`, so the declaration is held to the cores
the machine has. A machine with ten or more is unaffected, and the fourteen-core table above is
where ten was adopted in the first place. `DR-0017-0010` records the decision.

What this table does NOT say, because the measurement was not taken: that 10 is the right value for
every project. It compares settings on the largest one, which is what the rule asks for.
`BR-0017-0053` governs per-project tuning and requires one project per pull request behind three
green verdict runs — `TDD-0069` owns that and is not satisfiable until this branch has verdict runs
to quote.

## Provenance

One run per setting, not a best-of-three. Recorded as a limitation rather than smoothed over: the
4.39-second gap between 10 and 14 is inside the run-to-run variance this repository has already
shown elsewhere in this spec's evidence, so this data does not establish that 14 beats 10 — only
that the two are close, which is the fact the reason above rests on. The 4-worker row is outside
that band. A best-of-three is the obvious improvement if the margin ever approaches ten percent.
