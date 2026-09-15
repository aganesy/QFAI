# Engines-floor lane timing artifact — spec-0017

The before-and-after numbers for slicing the `node-floor` job, which `BR-0017-0030` requires before
a cost, wall-clock or parallelism claim may land. `AC-0017-0014`, `AC-0017-0015` and `AC-0017-0028`
each add the same second half: the numbers are quoted in the pull-request description as well as
written here, and a measured regression is recorded as the reason rather than re-run until it
agrees.

`DR-0017-0011` in `.qfai/specs/spec-0017/07_Decisions.md` carries the reviewable copy. This tree is
ignored by git, so a number that lives only here is unreviewable — that is why the rule names three
places and not one.

## What changed

The `node-floor` lane runs the package test suite on the floor `engines.node` promises. It ran the
whole suite in one process pool. It now expands over the same seven slices the `test` job declares —
`core, validators, integration, e2e, cli, unit, scripts` — with `fail-fast: false`. Each leg pins
and asserts the engines floor, and the build runs on the `e2e` and `integration` legs only.

The aggregate verdict is unchanged, because a matrix job contributes one rolled-up result.

## Before

Last successful run of `main`, run `34907604019`. `Started at` is an offset from the run's start.

| Job                | Duration | Started at |
| ------------------ | -------- | ---------- |
| node-floor         | 312s     | +10s       |
| lint               | 121s     | +0s        |
| test (integration) | 93s      | +12s       |
| test (cli)         | 76s      | +10s       |
| test (unit)        | 75s      | +12s       |
| test (core)        | 74s      | +10s       |
| build              | 59s      | +0s        |
| test (scripts)     | 53s      | +14s       |
| test (e2e)         | 42s      | +11s       |
| check-types        | 31s      | +10s       |
| test (validators)  | 29s      | +10s       |
| scanner-coverage   | 23s      | +15s       |
| check-types-future | 19s      | +10s       |
| detect             | 8s       | +0s        |
| ci-pass            | 3s       | +325s      |

Wall clock 328s. Runner time 1018s.

## After

First complete run on the branch, run `34942222156`.

| Job                      | Duration | Started at |
| ------------------------ | -------- | ---------- |
| lint                     | 120s     | +1s        |
| node-floor (integration) | 100s     | +11s       |
| node-floor (cli)         | 89s      | +11s       |
| test (cli)               | 86s      | +12s       |
| test (integration)       | 82s      | +11s       |
| node-floor (core)        | 79s      | +11s       |
| node-floor (unit)        | 78s      | +11s       |
| build                    | 76s      | +0s        |
| test (unit)              | 75s      | +11s       |
| test (core)              | 70s      | +10s       |
| node-floor (scripts)     | 69s      | +11s       |
| test (e2e)               | 69s      | +11s       |
| node-floor (e2e)         | 68s      | +10s       |
| test (scripts)           | 56s      | +11s       |
| check-types              | 34s      | +11s       |
| test (validators)        | 30s      | +12s       |
| node-floor (validators)  | 29s      | +11s       |
| scanner-coverage         | 28s      | +11s       |
| check-types-future       | 24s      | +11s       |
| detect                   | 8s       | +0s        |
| ci-pass                  | 4s       | +124s      |

Wall clock 128s. Runner time 1274s.

## The comparison

| Measure                   | Before | After  | Change          |
| ------------------------- | ------ | ------ | --------------- |
| Floor lane critical path  | 312s   | 100s   | −212s (−67.9%)  |
| Run wall clock            | 328s   | 128s   | −200s (−61.0%)  |
| Runner time               | 1018s  | 1274s  | +256s (+25.1%)  |

Both totals are derived from the tables above rather than reported alongside them: the durations sum
to 1018s and 1274s, and the wall clock is where `ci-pass` starts plus how long it runs. A reader can
recompute every figure in this section from the two tables.

## What sets the wall clock now

Before, `node-floor` did. It started at +10s and ran 312s, finishing at +322s, and `ci-pass` started
three seconds later.

After, `lint` does. Its 120s from +1s reaches +121s, against +111s for the longest floor leg, and
`ci-pass` starts at +124s. Slicing the floor lane further buys nothing on the wall clock until `lint`
is shorter, so the next lane to look at is named by the measurement rather than chosen.

## The regression, recorded rather than re-measured

Runner time rose 256s. The cause is structural and not a variance: the lane went from one job to
seven, so six further checkouts and toolchain setups are paid, and the build now runs on two floor
legs where it ran on one.

That cost is accepted for the 212s off the lane's critical path, and the reason is the measurement
above rather than an argument. No second comparison was run to improve the figure — `AC-0017-0015`
makes a measured negative result an accepting outcome precisely so that re-running until the answer
agrees is not the cheapest route.

## Provenance and limits

One run per side, on GitHub-hosted runners, not a best-of-three. Two consequences, stated rather
than smoothed over:

- The wall-clock and critical-path movements are far larger than the run-to-run variance this
  repository has recorded elsewhere in this spec's evidence, so they hold at this resolution.
- The runner-time figure is the one a single pair supports least, because it sums twenty-one jobs
  whose individual durations each carry that variance. Its direction is not in doubt — six extra
  setups and one extra build cannot be free — but treat +256s as the scale of the cost, not as its
  exact value.

Nothing re-does this file's arithmetic automatically. Unlike
`.qfai/evidence/timing-workers-spec-0017.md`, which `TC-0017-0065` reads and recomputes, no test row
owns this comparison: it measures a run of CI rather than a property of the tree, and a row asserting
it would have to trust a number no checkout can reproduce.
