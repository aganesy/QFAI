# Change Request

- ID: `CR-20260820-0003`
- Title: `BR-0017-0047 requires every project to declare a worker setting and a file-parallelism setting, and the runner scopes both to the root`
- Raised by: `/qfai-implement orchestrator, spec-0017 change 6; the specified shape was implemented first, then found inert by the runner's own type and by measurement`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — each knob is declared at the scope that reads it
- Applied at: `2026-08-23T00:00:00Z` — BR-0017-0047 and TC-0017-0060 rescoped; the root-only plant still reddens; the stale eight-project baseline corrected to seven
- Superseded by: `-`
- Blocked set: `none — TDD-0060 is implemented against the intent; what is open is which text moves`

## The specified declaration site does not exist for two of the six knobs

`BR-0017-0047`: "**Every project in the runner workspace** MUST declare a pool and its pool
options, a worker setting, a within-file concurrency setting, a file-parallelism setting and a hook
timeout."

`TC-0017-0060` repeats the scope: "Every project in the runner workspace declares pool and pool
options, workers, concurrency, file parallelism, hook timeout."

The runner does not accept two of those six on a project. From the installed runner's own type
declaration:

```text
type NonProjectOptions = 'shard' | 'watch' | … | 'coverage' | 'maxWorkers' | 'minWorkers' | 'fileParallelism';
type ProjectConfig = Omit<UserConfig, NonProjectOptions | 'sequencer' | 'deps' | 'poolOptions'> & {
    …
    poolOptions?: {
        forks?: Pick<NonNullable<PoolOptions['forks']>, 'singleFork' | 'isolate'>;
    };
};
```

So the worker axis has no project-level home at all: `maxWorkers` and `minWorkers` are excluded by
name, and `poolOptions.forks` is narrowed to `singleFork | isolate`, which removes `maxForks` as an
escape hatch. `fileParallelism` is excluded by name as well.

## The inert implementation, and the two things that caught it

Change 6's first implementation did exactly what the rule says: all six knobs on every project. Every
gate passed and **nothing emitted a warning**.

No compiler was ever going to catch it, and that is measured rather than assumed. `tsc -b` resolves to
`packages/qfai/tsconfig.json`, whose `include` is `["src/**/*.ts", "src/**/*.d.ts"]`; `--listFiles`
shows none of `vitest.workspace.ts`, `vitest.config.ts` or `vitest.knobs.ts`. The arrangement is
deliberate and already written down — `eslint.config.js:51` heads that exact file list with the
comment "Test files & config files outside tsconfig – disable type-checked rules". A first hypothesis
that the excess-property check was being bypassed by the object spread was tested and is **false**:
writing a root-only key inline on one project and introducing it through the spread both leave
`tsc -b` at exit 0, because neither file is compiled at all.

The runner also has no runtime complaint to make: it drops unknown project options silently.

So the only mechanism that can catch this class is a test, which is why `TDD-0060` now carries the
root-only guard.

It also did nothing. Measured on the `validators` project, same command, one variable changed:

```text
validators, worker override = 1        11.4s   46 files passed
validators, declared default (ten)     12.3s   46 files passed
ratio 0.93x
```

Constraining the worker count to one did not slow the project down. Two independent lines of
evidence — the runner's type and the stopwatch — agree that a project-level worker declaration is
inert.

This matters beyond one row. A declaration nothing reads is the same defect class as the test project
that matched zero files, which is what `TC-0017-0063` exists for. Change 6 came within one commit of
shipping a second instance of the defect the spec is trying to eliminate, and satisfying the
specified wording is what would have shipped it.

## What change 6 does instead

The knob set is defined once, in `packages/qfai/vitest.knobs.ts`, and split by the scope the runner
honours:

| knob                         | site               | why                                                              |
| ---------------------------- | ------------------ | ---------------------------------------------------------------- |
| `pool`, `poolOptions.forks`  | each project       | project-scoped, and the narrowed pair is what the runner accepts |
| `maxConcurrency`             | each project       | project-scoped                                                   |
| `hookTimeout`, `testTimeout` | each project       | project-scoped                                                   |
| `maxWorkers`, `minWorkers`   | `vitest.config.ts` | root-only by the runner's type                                   |
| `fileParallelism`            | `vitest.config.ts` | root-only by the runner's type                                   |

Both halves are still **declared** rather than inherited, which is what `BR-0017-0047` is actually
protecting. Only the declaration site follows the runner.

`TDD-0060` also gained a claim the specified shape could not have carried: **no project may declare a
root-only option.** That is the guard against the inert declaration recurring, and it would have
failed against change 6's own first implementation.

## Options

**A — rescope `BR-0017-0047` and `TC-0017-0060` to "the runner configuration", with the split named
(recommended).** The obligation stays "declared, not inherited"; the rule stops asserting a
declaration site the runner rejects. Add the root-only guard to the rule, since it is what keeps the
obligation honest.

**B — keep "every project" and declare the two root-only knobs on every project anyway.** This is
what was measured to do nothing. It satisfies the letter of the rule with configuration the runner
discards, which is worse than not declaring them: a future reader would take the workspace at its
word.

**C — keep "every project" and drop the two knobs from the set.** Loses the worker ceiling and the
file-parallelism flag from the repository entirely, putting both back in the runner's release notes —
the precise outcome `BR-0017-0047` exists to prevent.

## A note on what this does NOT decide

Nothing here adopts a parallelism value. `BR-0017-0049` gates the adoption of a final value on a
timing artifact comparing at least two settings on the **largest** project, one project per pull
request; `BR-0017-0051` puts revising the declared starting value of ten behind the user's sign-off.
The 11.4s/12.3s pair above is an inertness check on a mid-sized project, not a timing artifact, and
change 6 leaves both axes at ten.

## Related

- `BR-0017-0047`, `BR-0017-0048`, `AC-0017-0026`, `EX-0017-0047`, `TC-0017-0060`
- `spec-0017` `TDD-0060`, `TDD-0061`
- `packages/qfai/vitest.knobs.ts`, `packages/qfai/vitest.workspace.ts`, `packages/qfai/vitest.config.ts`
- `CR-20260820-0002` — the same class one change earlier: a specified observable the runner does not implement

## Impact

- Specs: `spec-0017 — BR-0017-0047 and TC-0017-0060`
- Plans: `none`
- Tests: `packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts — TDD-0060, TDD-0061, TDD-0068`
- Contracts: `none`
- Schema: `none`

## Decision needed from user

Take option A — rescope `BR-0017-0047` and `TC-0017-0060` to "the runner configuration" with the
root-versus-project split named, keeping the "declared, not inherited" obligation — or keep "every
project" and accept option B's inert declarations, or option C's loss of both knobs?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: rewrite `BR-0017-0047` so each knob is declared at the scope that reads
   it, and add the root-only guard that keeps "declared, not inherited" honest. Mode: **`re-derive`**. `BR-0017-0047`'s declaration site is what changes.
2. Downstream ledger sweep: **no rows are reset** under the recommended option. Change 6 implements
   the intent — root-scoped knobs at the root, project-scoped ones at the project — and the rows'
   evidence describes exactly that split. Named so a later sweep cannot widen:
   - not reset under option A: `TDD-0060`, `TDD-0061`, `TDD-0068`
   - conditional reset under option B or C: `TDD-0060` alone, as the row that asserts the
     declaration site.
3. Cross-check after applying: the oracle that plants a root-only option on a project must still
   redden, because the inert declaration is the failure this rule exists to prevent.

## Resolution

<!--
Filled in when Status leaves `open`. Record the rescoped rule text and the re-measured rows.
-->
