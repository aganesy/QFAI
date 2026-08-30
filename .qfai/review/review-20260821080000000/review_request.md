# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-6 repairs — v7 of the build classifier, the whitespace-collapsing
  `retractedClaims.test.ts`, the row-width and hand-off changes to the matrix test, the
  all-occurrence `stageEvidenceCounts.test.ts`, the monotone seal rule, and the handover item the
  released write depends on
- Round: 7
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Rounds 1-6 each returned REVISE. Round 6: `qa-gatekeeper` 10 blocking, `completion-reviewer` 6, P1d 2.
P1d's fifth pass reported, for the first time, **nothing saying the reasoning is wrong** — the DR is a
record it sustains whole, and what remained was two sentences describing the review itself.

Round 6's sharpest finding was that **one mechanism defeated two guards at once**: needles containing
spaces matched against text where Prettier had put newlines. The guard whose premise is "prose cannot
be trusted to say whether prose was deleted" was defeated by the formatter `ci:lint` enforces.

## What changed since round 6

1. **v7.** Only a flag that takes a **directory** ends the subcommand position (`cmake --install build`
   yes, `cargo --locked build` no); `--filter`/`-F` select a **package** and leave the manifest alone,
   which is what makes `pnpm build` / `pnpm --filter qfai build` / `pnpm -F qfai build` agree; only a
   **target-naming** flag's value can name a target; `--ignore-scripts` suppresses lifecycle hooks.
   Round 6's cases are in the committed corpus.
2. **`retractedClaims.test.ts`**: whitespace collapsed on both sides, every claim searched in **every**
   governance file, quotations extracted **per paragraph**, italics no longer counted as quotation. It
   found three live violations on its first run; all are quoted now.
3. **The two guards' conflict is resolved** — the matrix no longer pins the refuted figure's absence,
   because `retractedClaims` permits it quoted and a legal edit under one reddened the other.
4. **Row width enforced** in the matrix test: a missing cell was being backfilled by a default, so
   deleting one pipe changed nothing observable.
5. **All occurrences, not the first**, in `stageEvidenceCounts.test.ts`, with disagreeing values as
   their own finding; a per-**file** floor for recorded outputs; and the `.each` precondition asserted
   rather than the runner emulated.
6. **The seal rule is monotone**: every older pack carries a seal, every recorded seal recomputes, the
   newest may be either. The previous rule went red exactly at the completion gate.
7. **The handover carries the condition P1d attached to the write it released**: `test-list.md:107`'s
   `Evidence` cell contradicts the `Blocked-By` it is about to get.

## What I most want challenged

1. **Break v7.** Seventh version, fifth reported clean. You chose the corpora that broke v3 through
   v6. Attack `DIRECTORY_VALUE_FLAGS`, the `--filter` handling, `PASSTHROUGH`'s new `buildx`, and the
   `noScripts` propagation.
2. **Break `retractedClaims.test.ts` a third time.** Whitespace collapse, per-paragraph quoting,
   all-file search. Find a way to assert a refuted claim that survives it, or a retraction of your own
   that is missing from its list.
3. **Break `stageEvidenceCounts.test.ts` and the matrix test again.** Both were broken in each of the
   last two rounds.
4. **Re-derive every number**, including the six pack seals and the P7 derivation, which round 6 found
   wrong twice with correct endpoints.
5. **`TDD-0070`'s remaining blocker.** P1d has refused six times. Say precisely what is left, and
   whether the remaining set is still shrinking.

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes.
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks from the index first.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`.
