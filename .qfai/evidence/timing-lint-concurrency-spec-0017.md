# Lint-gate and within-file concurrency timing artifact — spec-0017

The before-and-after numbers for two changes that land together: the lint gate runs five lanes
concurrently instead of two, and the within-file concurrency axis gains a cap. `BR-0017-0030`
requires both sets of numbers before a cost, wall-clock or parallelism claim may land.
`AC-0017-0014`, `AC-0017-0015` and `AC-0017-0028` each add the same second half: the numbers are
quoted in the pull-request description as well as written here, and a measured regression is
recorded as the reason rather than re-run until it agrees.

`DR-0017-0012` and `DR-0017-0013` in `.qfai/specs/spec-0017/07_Decisions.md` carry the reviewable
copies. This tree is ignored by git, so a number that lives only here is unreviewable — that is why
the rule names three places and not one.

## Why both subjects are in one file

`.qfai/evidence/timing-node-floor-spec-0017.md` was given its own file because it answered a
different rule on a different subject from the worker-setting artifact beside it. Neither reason
separates the two subjects below.

- **One change, one tree, one pull request.** The lint gate's "after" figures already contain the
  concurrency change: `tests/core/prFixMonitor.test.ts` is one of the eight files the mirror lane
  runs, and making its cases concurrent is what shortens the lane the other five contend with. Put
  in two files, the cause would sit in one and half of its effect in the other, and neither file
  would be readable alone.
- **Same rule.** Both are `BR-0017-0030` records, and `BR-0017-0030` asks for the numbers in three
  places rather than for one artifact per measurement.

What does force a new file rather than an extension of
`.qfai/evidence/timing-workers-spec-0017.md`: `TC-0017-0065` scans that file with a row pattern
over its whole text, reading every `| <integer> | <number>s |` row as a worker setting and its
duration. The concurrency sweep below has exactly that shape and means something else, so landing
it there would feed the row settings it never measured.

Nothing re-does this file's arithmetic automatically. Every derived figure is computed from the
tables above it, so a reader can recompute all of them.

## Subject 1 — the lint gate

### What changed

`scripts/run-lint-checks.sh` ran two lanes: the mirror-surface runner, and one serial chain of
eighteen commands beside it. It now starts five, and `packages/qfai/tests/core/prFixMonitor.test.ts`
runs its fifteen cases concurrently, which shortens the mirror lane those five contend with.

### The comparison

`pnpm ci:lint` end to end, same machine, nothing else running, three runs per shape. The "before"
figures were taken by stashing the change on this same branch, so both shapes ran against the same
tree and the same machine state.

| Run    | Before  | After  |
| ------ | ------- | ------ |
| 1      | 112.6s  | 80.1s  |
| 2      | 118.5s  | 83.6s  |
| 3      | 114.5s  | 79.9s  |
| median | 114.5s  | 80.1s  |

Both shapes exited 0 on every run.

| Measure          | Before | After | Change         |
| ---------------- | ------ | ----- | -------------- |
| Median wall clock| 114.5s | 80.1s | −34.4s (−30.0%)|

The two ranges do not overlap: the slowest run after, 83.6s, is 29.0s faster than the fastest run
before, 112.6s. That is what the three-run pair establishes — not the exact 34.4s, which carries the
run-to-run variance of six runs, but that the whole of one distribution sits below the whole of the
other.

### The lanes, and why they are grouped this way

| Lane                | Contents                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| existing            | `lint:mirror-surface`                                                        |
| new                 | `format:check`                                                               |
| new                 | `lint`                                                                       |
| `ci:lint:structure` | `lint:md`, `lint:mermaid`, `lint:mdschema`, `lint:shipping`, `lint:workflow-shape` |
| `ci:lint:scans`     | eleven `scripts/check-*.mjs` readers                                          |

Peak concurrency observed on a real run: five lanes, sampled every 400 ms.

The lane costs were measured separately and under load, so they indicate the shape of the gate
rather than absolute times. Two of the grouping decisions are constraints rather than preferences,
which is why they are recorded:

- **Seven of the eleven readers invoke `git`.** All seven sit in one serial lane, so no two git
  subprocesses in the chain run concurrently and no index contention is introduced.
- **Two of the eighteen commands each start a forking test runner.** They share one lane and are
  kept away from the mirror lane, because oversubscribing forks past the core count is already
  measured — in `packages/qfai/vitest.knobs.ts` and in subject 2 below — as slower and noisier.

`format:check` is now the gate's floor. No regrouping moves the number further; only splitting the
formatter itself would.

### Limits of this measurement

The CI runner has four cores against this machine's fourteen. Five lanes plus the mirror lane's
forks is more processes than cores there, which is the same oversubscription subject 2 measures a
cost for. The local direction is unambiguous, but the CI figure must be read off the pull-request
run rather than inferred from these numbers.

No wall-clock regression was measured locally, so `AC-0017-0015` has nothing to record on this
subject. The unmeasured CI figure is stated as a limit and not as a result: recording it either way
before the run exists would be the argument `BR-0017-0030` forbids.

## Subject 2 — the within-file concurrency cap

### What changed

`packages/qfai/vitest.knobs.ts` gains `maxConcurrency`, declared as
`Math.min(DECLARED_START, availableParallelism())` with an environment override, mirroring the
worker axis `DR-0017-0010` capped.

### The sweep

`packages/qfai/tests/core/prFixMonitor.test.ts` standalone — fifteen cases, each spawning a shell
that runs a script through its poll loop and shelling out once per poll, which makes it the
heaviest concurrent file the suite has. One full run per setting, 15 of 15 passing every time.

| maxConcurrency | 14 cores | 4 cores |
| -------------- | -------- | ------- |
| 1              | 65.0s    | 58.4s   |
| 2              | 38.5s    | 42.7s   |
| 4              | 25.2s    | 36.1s   |
| 5              | 28.7s    | 36.8s   |
| 8              | 28.7s    | 39.8s   |
| 10             | 27.7s    | 47.0s   |
| 15             | 27.0s    | 44.1s   |

### What the sweep decides

The cap hands the runner four on a four-core machine and ten on a fourteen-core one, so each column
is read against its own capped value.

| Column   | Fastest measured | Uncapped ten | Capped value | Capped value vs fastest |
| -------- | ---------------- | ------------ | ------------ | ----------------------- |
| 4 cores  | 4 at 36.1s       | 47.0s        | 4 at 36.1s   | the fastest measured    |
| 14 cores | 4 at 25.2s       | 27.7s        | 10 at 27.7s  | +2.5s (+9.9%)           |

**The four-core column decides it.** Ten is 10.9s over four, 30.2% slower, outside the ten per cent
`EX-0017-0049` allows. A repeated pair on the same core count gave the same verdict three times over.
Past the cores the extra shells wait for a core while holding the memory and the scheduler slots of
shells that are running.

**On fourteen cores the cap costs nothing.** The curve is flat from four upward — 25.2s to 28.7s, a
3.5s band — and the capped value of ten sits 9.9% off the fastest measured, inside the same
allowance. `EX-0017-0049` requires a written reason for an adopted value that is not the fastest,
and the reason is `BR-0017-0051`: ten is the user's declared starting value, and no agent may
substitute a different one on the strength of its own measurement. Adopting four here would be
exactly that substitution.

`EX-0017-0049` is written for the worker axis. The same ten per cent test is applied here by
analogy, because `BR-0017-0048` declares ten on both axes and no example fixes an allowance for the
second. The analogy is stated rather than assumed, so a reader can reject it and still read the
table.

### The regression, recorded rather than re-measured

The four-core column is a measured "no" for the uncapped ten, and it is what this change rests on
rather than something to re-run past. `AC-0017-0015` makes a measured negative result an accepting
outcome precisely so that re-running until the answer agrees is not the cheapest route, and
`BR-0017-0031` forbids the loop outright. Each run above changed exactly one variable; the verdict
comes from the differences between them, not from repetition until a preferred number appeared.

The declared value did not move. `DECLARED_START` is still ten, both axes are still overridable, and
`QFAI_TEST_MAX_CONCURRENCY` is still honoured as asked, so a comparison can still oversubscribe —
which is what made this table possible.

### What the file itself now costs

`prFixMonitor.test.ts` falls from 62.3s and 67.8s unmodified to 28.7s when the machine is quiet.
That is the shortening subject 1's mirror lane inherits.

### Limits of this measurement

- The four-core figures come from a Windows processor-affinity mask, not from the CI runner.
  `availableParallelism()` honours the mask, so the cap resolves to four under it exactly as it
  would on a four-core machine — but the mask constrains this machine's scheduler and not a
  runner's, and the two are not the same environment.
- One file, chosen as the heaviest concurrent one in the suite. A file whose cases are cheap and
  non-spawning would show a flatter curve, and this sweep does not claim otherwise.
- One full run per cell, not a best-of-three. The 30.2% verdict is far outside the run-to-run
  variance recorded elsewhere in this spec's evidence and holds at this resolution; the 9.9% figure
  on fourteen cores is close enough to the allowance that a best-of-three is the obvious improvement
  if the allowance is ever lowered.
