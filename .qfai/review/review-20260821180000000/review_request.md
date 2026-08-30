# Review request — round 12, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. Record `git rev-parse --short HEAD` at start
and finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it.

## Plant isolation (new, and mandatory)

Round 11's `qa-gatekeeper` caught a `qfai-extra.yml` in the shipped asset tree that it had not created and
traced it to the `implementation-reviewer` planting concurrently. Committing this request before launch —
round 1's fix — does nothing about reviewers mutating the subject *at the same time*, and the failure mode
is worse than noise: a reviewer whose plant collides can attribute a catch to the wrong instrument.

So plants are isolated by role:

- **`qa-gatekeeper` owns `packages/qfai/assets/init/root/.github/workflows/`.** It is the only role that
  may write there, and it must still revert with a printed byte comparison in a `finally`.
- **`implementation-reviewer` must not write to that directory.** Probe the helpers directly — which is
  where round 11's findings came from anyway — or copy the tree into `tmp/r12-impl/` and point a fixture
  at the copy.
- **`completion-reviewer` does not plant.** Its subject is the records.

If your measurement genuinely needs the real asset tree and you are not the gatekeeper, say so in your
report rather than taking it.

## Where the stage stands, and what moved

**The gate moved for the first time in eleven rounds: `error=2` to `error=1`.**

- `QFAI-ATDD-111` is closed. `US-0017-0007` is covered by
  `tests/e2e/spec0017RunnerParallelismE2E.test.ts`.
- `QFAI-ATDD-112` reports **six** TCs rather than eight; `TC-0017-0016` and `TC-0017-0030` are covered by
  `tests/integration/spec0017OwnWorkflowScope.test.ts`. The remaining six are exactly the rows parked on
  `CR-20260820-0007` (four) and on `CR-20260820-0012` / `DR-0017-0010` (two).
- `TDD-0069` and `TDD-0070` are still `todo` in `tdd/test-list.md`, whose cells `/qfai-implement` owns.

Everything named below is **new since round 11 sealed** and no reviewer has seen any of it.

## 1. The allowlist, rebuilt to fail closed

Round 11 ran fifteen of eighteen real builds past it. The repair split `invocationOf`'s `undefined` into
`NOTHING` (provably invokes no program) and `UNREADABLE` (**a refusal**), on the argument that fixing the
five measured parser holes would leave the sixth. Attack that argument:

- find a construct that reaches `NOTHING` and should not — the classes are keyword prefixes, `case` arms,
  assignments, function headers and block terminators, and each is a place a command can hide;
- or get a real build to run in a shipped lane while `refusals()` returns `[]`, by any route;
- `HARMLESS_PROGRAMS` gained `[`, `[[`, `test` and `false`; `git` left it for `git diff` / `git rev-parse`.
  Is any of the four able to reach a build? `[` is a program.
- `TAKES_NO_PACKAGE` closes the two-token prefix for five install forms. Is that list the right one, and
  is a third bare argument reachable another way?

## 2. `US-0017-0007`'s new test, which is the story's first assertion of an effect

`tests/e2e/spec0017RunnerParallelismE2E.test.ts` spawns a fixture suite twice through the real
`rootKnobs` and asserts peak file concurrency is 1 at one worker and greater than 1 at four. Four
mutations were measured reddening it, including a rename of the override that the first version could not
see because it read the name from the module it tests.

- Is the observation sound, or can peak concurrency be 1 at four workers on a machine this project
  targets — making it a flake rather than an assertion?
- Can the axis be made inert in a fifth way this test does not see?
- The eight sibling tests in `tests/scripts/` all assert DECLARATIONS. Is any of them vacuous in the way
  round 1 found the withdrawn `US-0017-0007` assertion to be?

## 3. `TC-0017-0016`'s disagreement with the tree

The case expects two non-minimal permission blocks; the tree has three, because `github-release` needs
`contents: write`. The test asserts the measured set of three and reports the disagreement rather than
bending. Rule on that choice, and check the reading: is the third departure necessary, or is it an
over-grant the case was right to exclude?

## 4. The async conversion, and what it already cost

`tests/integration/shippedWorkflowDetection.test.ts` moved from `spawnSync` to promisified `execFile` and
now builds its three fixtures concurrently: 14.36s to 9.39s. The conversion left **six call sites without
`await`**, `tsc -b` accepted all six, and the failure surfaced as a different test asserting the absence of
a warning it now received.

- Are there more missing `await`s, or a promise whose rejection is now swallowed by the `run()` helper's
  catch, which folds a non-zero exit into a status?
- Do the three concurrent fixtures share anything — a temp-directory helper, a git config, an env var?
- Is any other test in this suite in the same state the timed-out one was: spending its whole budget with
  the machine idle?

## 5. `command()`'s extraction

`resolveHead`, `openingVerdict` and `readFlag` came out of a 211-line function, now 127. The first
extraction attempt collapsed three distinct flag effects and moved 143 member cases; the hand-written
replacement keeps them separate. Verify the behaviour is genuinely unchanged — the frozen probes say
32/32 and 50/50 — and look for a fourth effect the three do not name.

## 6. The record

- Every count. The record now claims several are derived; check the claim per number.
- The recurring-class list at item 7 holds fourteen entries and claims to be canonical. Find a fifteenth.
- `### Findings per round` owes three rows this round.
- Three numbers move when this round's reports land. Check them at your HEAD.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule: distinct finding identifiers
appearing as a heading at level two to four, optionally backtick-wrapped.

Write to `.qfai/review/review-20260821180000000/R0N_<role>.md`. It will be force-added at the sealing step,
because `.gitignore` ignores `.qfai/review/*`.
