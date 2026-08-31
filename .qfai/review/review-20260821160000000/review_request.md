# Review request — round 11, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. `git rev-parse --short HEAD` and record it at
start and finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, pass 6, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it. Where a finding
touches `DR-0017-0010`, it touches the record around it, never the gate.

**Read-only.** Revert every mutation in the step that makes it, with a printed byte comparison. Scratch
under `tmp/r11-<role>/`. Do not edit the subject, and do not run `validate` against the working tree —
use a `git archive HEAD` shadow root, re-materialising the tracked symlinks.

## Where the stage stands

Unchanged and still FAIL by this skill's own Definition of Done:

- `US-0017-0007` is uncovered, so `QFAI-ATDD-111` reports it and eight `TC`s are uncovered under
  `QFAI-ATDD-112`. The scoped gate is `error=2` (`info=2 warning=0`).
- `TDD-0069` and `TDD-0070` are both still `todo` in `tdd/test-list.md`. `/qfai-implement` owns those
  cells; this stage owes the evidence they point at.
- Stage Minimum Roles were not used for P2-P4.

## What ten rounds have established about how to find defects here

Twenty-nine reviewer responses have produced one finding class more than any other: **a claim asserted
over how something is written rather than over what it does**. The canonical list is at
`.qfai/evidence/atdd-spec-0017.md` § "Gaps / Open risks" item 7, and it now holds eleven entries. Every
one of them was found by MUTATING an instrument, never by reading it. Reading this record will not find
the twelfth.

So the questions below are all of one shape: **take an instrument that currently reports clean, and make
it report clean while the thing it forbids is present.**

## 1. Attack the allowlist, which is now the story's instrument

`US-0017-0004` no longer rests on the build classifier. It rests on
`packages/qfai/tests/helpers/shippedLaneCommands.ts`, which enumerates what a shipped lane may INVOKE —
nine programs by name, six exact invocations, three actions and four action input keys — and refuses
everything else. The argument for it is that a denylist over build spellings fails OPEN while an
allowlist fails CLOSED, and that this one needs no corpus.

**No round has falsified it from outside.** It was written in round 10 and its only oracle is its own
test file. Break it:

- get a real build to run in a shipped lane while `refusals()` returns `[]`. The parser is the surface:
  `commandsOf` splits on spaced pipes and enters `$( … )`; `invocationOf` takes the program and the first
  non-flag argument, with `OPAQUE_AFTER` for `-e`/`-c`; `localFunctionsOf` exempts functions the body
  defines. Any of those is a candidate.
- the nine name-allowed programs are claimed to be unable to reach a build "whatever their arguments".
  `git`, `grep`, `read`, `printf` and `cut` are on that list. Is that true? `git` alone has subcommands
  that run arbitrary configured commands.
- the `uses:`/`with:` half enumerates action input keys. Find an input key on an allowed action that runs
  something, or an allowed action whose default behaviour builds.

## 2. Refute this round's deletions

Round 10's `B3` established that a deletion justified by a sweep's silence is unsound, because the
sweep's report is identical whether a member is dead or whether the corpus merely lacks its shape. This
round deleted several things anyway, each on a **structural** argument rather than a corpus one. Refute
one:

- nine `builds: ["build"]` entries, deleted because a declared tool already reads a bare `build` through
  the generic verb rule;
- hugo's `values`, deleted because its own `bareIsBuild` decides first;
- `@vercel/ncc` from `BUNDLERS`, deleted because the unknown-binary rule reads the word `build`;
- `tox`'s `stops: ["--version"]`, deleted because `--version` is already in `NEVER_FLAGS`.

A refutation is a command whose verdict the deleted entry decided.

## 3. Attack the ordering change and the new per-tool list

- **A declared `stops` entry now beats the generic `build` verb rule.** Only docker and cmake declare
  stops, so the intended blast radius is `cmake build` → `none`. Find a real build this now misses.
- **`never` is a per-tool list of "do not do it" flags**, added because `make -n build` was a build while
  `make --dry-run build` was not. It is checked before anything can return `build`, over ALL tokens. Find
  a real build carrying one of make's five never-flags as a value rather than as a flag.

## 4. Break the guards added this round

Three prose claims moved from typed to derived. Each has a falsification recorded; find one that does
not:

- `## Final status`'s round and response counts are derived from the packs on disk, and the verdict split
  is pinned by having to SUM to the derived response count. **This round's pack makes the numbers move**,
  which is the situation five earlier rounds got wrong. Check them at your HEAD.
- the matrix's `Status` totals, its `❌` partition and the predicate-version sentence are now sought in
  BOTH records. Find a third place one of them is restated.
- `retractedClaims.test.ts` asserts its coordinate model by identity against the source plus tiling. The
  first version of that assertion was defeated by three mutations because it checked arithmetic; find a
  fourth mutation that defeats the second version.

## 5. The scope question, one level out

`shippedJobs()` derives the workflow set from the shipped directory rather than listing it, because round
10 found a build in `qfai-validate.yml` that the row did not read. Two follow-ups:

- does it actually read what `qfai init` emits, or only what the fixture happens to contain?
- `US-0017-0004` is one row of nine. Are any of the other eight scoped narrower than the story they are
  annotated for? That was true of this one for ten rounds and nobody checked the others.

## 6. Prose, and the counts that expire

- Any count in either evidence file that nothing derives. The record now claims several are derived —
  check that claim per number, not per sentence.
- `### Findings per round` gains a row this round. Does the paragraph above it still describe how the
  table was built?
- The recurring-class list at item 7 claims to be canonical. Is there a twelfth?

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings identified as
`B*` / `M*` / `m*` / `A*` so `summary.json` can be derived from your headings by the pack's stated rule:
distinct finding identifiers appearing as a heading at level two to four, optionally backtick-wrapped.

Write your report to `.qfai/review/review-20260821160000000/R0N_<role>.md`. It will be force-added at the
sealing step, because `.gitignore` ignores `.qfai/review/*` and round 10's own `m7` found a report
sitting untracked while the round was in flight.
