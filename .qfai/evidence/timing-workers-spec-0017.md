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

Largest project: `core` (2439 tests). Measured, not assumed — every runner project enumerated on
the same machine, same commit, with `vitest list --json` (a collection pass, so it counts declared
cases and agrees with the `2439 passed` the runs below report):

```text
core         2439 tests   145 test files
e2e          1531 tests    91 test files
integration  1178 tests   142 test files
validators    640 tests    44 test files
cli           614 tests    23 test files
unit          502 tests    54 test files
scripts       390 tests    17 test files
```

`core` is the largest by test count. The count is stated in both units because the two are used for
different things: file count is what the row re-checks (a directory walk costs milliseconds, and
spawning the runner from a test is the cost that put this spec's own integration slice past its
timeout), and case count is what "largest" is judged on. `integration` is within three files of
`core` and holds half the cases, which is why the two units cannot be substituted for each other.

test files: 145

## The comparison

Machine: 14 logical CPUs. Command: `QFAI_TEST_MAX_WORKERS=<n> pnpm -C packages/qfai test:core`,
one full run per setting, `Duration` as vitest reports it.

| workers | duration | vs fastest | tests                     |
| ------- | -------- | ---------- | ------------------------- |
| 4       | 107.53s  | —          | 2439 passed \| 22 skipped |
| 10      | 111.27s  | +3.48%     | 2439 passed \| 22 skipped |
| 14      | 126.84s  | +17.96%    | 2439 passed \| 22 skipped |

adopted: 10

Fastest measured: 4 workers at 107.53s. The adopted value of 10 is **3.48% slower**, inside the ten
percent `EX-0017-0049` allows, so the accepting condition is the second one and a written reason is
required.

## Reason for not adopting the fastest

The value is the user's, given as an instruction: **ten is mandatory**, and when a measurement made
ten look flakier the instruction was to correct the structure that creates the contention rather
than the number that exposes it. `DR-0017-0009` records that episode, including the proposal to
lower the value and its refusal; `BR-0017-0051` reserves the choice of starting value to the user in
the first place, so adopting 4 on the strength of this table is not a decision this row may take.

**The second argument this section used to make is withdrawn, not re-typed.** The previous
measurement — 122 test files, 1587 cases — found the whole 4-to-14 spread worth 2.7 seconds on a
133-second run, about 2%, and concluded from it that `core` "is not worker-bound at all". On this
tree the spread is **19.3 seconds on a 107-second run, about 18%**, and it is monotonic in the
setting. The project has since grown by 23 files and 852 cases, and the shape of the curve went with
it. So the case for 10 rests on the instruction and on the margin — 3.48%, 3.7 seconds — and no
longer on a claim that the setting does not matter. Anyone lowering the ten-percent allowance should
re-read this table first: the old one would have survived any threshold, and this one would not.

What this table does NOT say, because the measurement was not taken: that 10 is the right value for
every project. It compares settings on the largest one, which is what the rule asks for.
`BR-0017-0053` governs per-project tuning and requires one project per pull request behind three
green verdict runs — `TDD-0069` owns that and is not satisfiable until this branch has verdict runs
to quote.

## Provenance

One run per setting, not a best-of-three. Recorded as a limitation rather than smoothed over: the
3.74-second gap between 4 and 10 is inside the run-to-run variance this repository has already shown
elsewhere in this spec's evidence, so this data does not establish that 4 beats 10 — only that the
two are close, which is the fact the reason above rests on. The 14-worker row is outside that band
and is the one new fact here. A best-of-three is the obvious improvement if the margin ever
approaches ten percent.

**Why this file was re-measured.** `main` reached 145 `core` test files against the 122 recorded
here — 18.9% against the row's twenty-percent tolerance, so any branch landing three more core test
files reddened `TC-0017-0065`, and with it `test (e2e)`, `node-floor` and `ci-pass` (#1151). The
row's stated reason is that "beyond twenty percent the comparison describes a different project",
and it was right: the spread this re-measurement found is nine times the one it replaced. Re-typing
the file count alone would have left the withdrawn paragraph above standing.
