# Change Request

- ID: `CR-20260823-0001`
- Title: `The CLI pays a second of bundle load before every command, and the test suite is priced on it`
- Raised by: `/qfai-atdd orchestrator, spec-0017; found while diagnosing three full-suite failures at the declared ten workers`
- Raised at: `2026-08-23T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `3` — measure the module graph first
- Applied at: `2026-08-23T00:00:00Z` — see Resolution
- Superseded by: `-`
- Blocked set: `-`

## The measurement

Five samples each, unloaded machine, median reported:

```text
node -e 0                                     92 ms    the interpreter floor
node -e 'require("dist/cli/index.cjs")'     1257 ms    loading the bundle, running nothing
node dist/cli/index.cjs --version           1154 ms    a command that does no work
```

`packages/qfai/dist/cli/index.cjs` is 1.44 MB. **Ninety-three per cent of the cost of invoking the CLI
is loading it**, and it is paid identically by `--version` and by a full `validate`.

## Why it is a defect and not a fact of life

It is not the wall-clock of one command; it is the price of the suite.

- Fifty-seven test files spawn the built binary, most of them several times per test.
- The declared pool is ten workers (`vitest.knobs.ts`, `DECLARED_START`), so up to twenty Node
  processes run at once, each paying that second before doing anything.
- In a run of the `e2e` project alone, five tests exceed 15 s and the slowest takes 47.3 s. In a
  full-suite run three tests failed outright on the 15 s budget.

The budget was raised to 120 s so that working tests finish, and the comment on `projectKnobs` says
plainly that this treats the symptom. **The number should come back down when this is fixed**, and the
measurement above is what to re-take.

It also costs adopters directly: every `qfai` invocation in an adopter's CI lane pays the same second,
and the shipped `qfai-tests.yml` invokes it repeatedly.

## Options

1. **Load only the command that was asked for.** Split the command implementations behind dynamic
   `import()` so the entry parses argv, resolves one command and loads that. Largest win, and the
   normal shape for a CLI this size. Risk: the entry currently imports for side effects in places, and
   each one has to be found rather than assumed absent.
2. **Split the bundle by command at build time** (`tsup` multiple entries) and dispatch with a thin
   launcher. Same win, more build surface, and the published `bin` mapping changes.
3. **Trim what the entry pulls in transitively.** Cheaper and smaller: measure the module graph, find
   the heavy leaves that no command path needs eagerly, and cut those. May recover most of the second
   with no architectural change; may recover very little. Needs the measurement first.
4. **Do nothing and keep the 120 s budget.** Honest, and it leaves the adopter-facing cost in place.

Recommendation: **3 first, as a measurement**, because it decides whether 1 is necessary. If the graph
turns out to be dominated by one or two eager leaves, 3 is the whole fix; if it is spread across every
command, 1 is the only thing that works.

## Not this stage's to take

`spec-0017` owns the CI scaffold and the acceptance tests over it, not the CLI's module graph. This is
filed rather than fixed because choosing between the options above is a decision about the shipped
binary's architecture, and because doing it inside a pull request already at 319 files would bury it.

## Resolution

jsdom measured at 910 ms of ~1000; moved behind a dynamic import; four entries now 157/166/167/190 ms, an 81-85 percent reduction, with a byte guard against regression
