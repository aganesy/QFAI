# Review request — round 13, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. Record `git rev-parse --short HEAD` at start and
finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it.

## Two rules about who may write, both learned the hard way

- **Plants are partitioned by role.** `qa-gatekeeper` owns
  `packages/qfai/assets/init/root/.github/workflows/` and is the only role that may write there. Round 11's
  gatekeeper caught a file in that directory it had not created and traced it to a sibling planting
  concurrently; a colliding plant can attribute a catch to the wrong instrument.
- **The stage does not edit the subject while this round runs.** Round 12's partition worked and addressed
  the wrong half: I was the third writer. `R01` reported ten files edited beneath it, four of them the
  helper under review, and **two of its findings then failed to reproduce** against the finished tree. A
  finding measured against a half-applied state is indistinguishable from a false one, so if you see the
  subject move, say so — it is a defect in how I ran the round, not in your measurement.

## What this round reviews

**Almost everything named below is round 12's repair work, and much of it is the repair of a repair.** Five
of the defects round 12 found were introduced by the two or three commits before it, so the base rate of
"the fix was the defect" in this area is high and worth assuming rather than discovering.

### 1. The allowlist, after eight escape classes

Round 12 planted four and three shipped; the four remaining classes it named were then closed. Current
state of `packages/qfai/tests/helpers/shippedLaneCommands.ts`:

- `invocationOf` returns a string, `NOTHING` (provably invokes nothing) or `UNREADABLE` (**a refusal**);
- keyword heads, `case` arms and one-line function definitions are PREFIXES, skipped rather than stopped at;
- `case` / `select` skip past their `in`; `for` terminates;
- a removed `$( … )` leaves a placeholder, and a command containing one is unreadable **unless** its program
  is on the by-name list;
- an assignment prefix whose value is a path or script file is unreadable;
- a `|` splits unless a `)` is reachable before any `;`, newline or `(`;
- `node -e` payloads are enumerated by sha256 digest;
- the by-name list is trimmed to the nine programs the shipped tree invokes, and a test requires every
  member to be invoked by it;
- `headIndexOf` is shared by `invocationOf` and `bareArgumentsOf`, which previously disagreed about which
  token is the program.

Break it. Get a real build, or arbitrary code, to run in a shipped lane with `refusals() == []`. The
argument to attack is that splitting `undefined` into `NOTHING` and `UNREADABLE` closes holes nobody
enumerated — so the useful finding is a construct reaching `NOTHING` that should not, or a program on the
by-name list whose arguments can reach a build after all.

### 2. `US-0017-0007`'s test, after its fixture was rebuilt

Round 12 found the fixture flattened `rootKnobs` and `projectKnobs` into one block, so it could not express
the one inertness mode `vitest.knobs.ts` documents. It now mirrors the real shape, and moving `maxWorkers`
to project scope reddens it. Five falsifications are listed in its docstring.

- Is the observation sound on a machine this project targets, or is `peak > 1` at four workers a flake?
- Is there a sixth way to make the axis inert?
- The docstring concedes that a sibling declaration test catches mutation 5 too, and claims the pair is what
  covers the story. Is that honest, or does the E2E add nothing the siblings lack?

### 3. The type-check that did not exist

`packages/qfai/tsconfig.json` includes `src/**` only, so `tsc -b` had never read a test file, and
`eslint.config.js` disabled type-checked rules over `tests/**`. `tsconfig.tests.json` now covers the files
this stage authored and `pnpm check-types` runs it; four promise rules are re-enabled over the same set.

- Is the include list right, or does it miss a file this stage authored?
- The whole tests tree reports **212** type errors and this spec's own files **54**. Verify both numbers.
- Does the eslint block actually apply? A `files:` list that does not match reports nothing and looks
  identical to a clean run.

### 4. The Coverage Depth Matrix and its guard

`US-0017-0007`'s row is rescored `✅ ❌ ⚠️ ⚠️ ❌ ❌ ✅ | ⚠️` with a reason per remaining `❌`, the partition
re-derived as A 23 / B 9 / C 1 / D 1 = 34, and a new class D. The guard now requires each depth column's
score to agree between the table and the row's justification bullets.

- Round 12 found the previous guard comment claiming a gate it did not have, and my first repair vacuous for
  the one row it guards. Is the second one vacuous too?
- Is class D a real class or a bucket invented to keep a total tidy?
- Are the raised cells honest against what the test measures?

### 5. What was deleted, which is where a wrong deletion hides

- the per-commit e2e sequence table (its invariant violated in six rounds, nothing checked it);
- `openingVerdict`'s `NEVER_FLAGS` check (dead — `resolveHead` refuses first);
- an unreachable assignment guard in `invocationOf`;
- `[[`, `test`, `false` from the by-name list;
- nine `builds: ["build"]` entries, hugo's `values`, `@vercel/ncc`, tox's `stops` (rounds 11-12).

Refute one: find a command, a revision or a reader for whom the deleted thing was load-bearing.

### 6. The record

- Every count. Several are newly derived and several were re-measured this round; check per number.
- `### Findings per round` owes three rows; `## Final status` owes a response count and a verdict split.
- The recurring-class list holds sixteen entries and claims to be canonical. Find a seventeenth.
- The gate is `error=1`, `QFAI-ATDD-112` on eight TCs, and the record claims each has a recorded reason
  while three of the eight are recorded somewhere the ledger does not point. Verify per row.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule: distinct finding identifiers
appearing as a heading at level two to four, optionally backtick-wrapped.

Write to `.qfai/review/review-20260821200000000/R0N_<role>.md`, in small appends rather than one large
heredoc — a spawn limit killed a report mid-write in round 11. It will be force-added at the sealing step,
because `.gitignore` ignores `.qfai/review/*`.
