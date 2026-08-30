# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-4 repairs — the v5 build classifier and its four corpora, the third `ELOOP` site, the
  ratchet with no claim-count assertion, the matrix test's prose pinning, the `Blocked-By` column,
  `DR-0017-0010`'s third statement of clause 1, `CR-20260820-0012`'s bound option 5 — plus one new
  artifact, `packages/qfai/tests/assets/stageEvidenceCounts.test.ts`
- Round: 5
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Rounds 1-4 each returned REVISE, and every round found a defect **inside the previous round's
repairs**. Four times the new defect was in the fix for a finding about that same class of defect. The
most recent: `DR-0017-0010` has now stated clause 1 three different ways across three P1d passes, each
wrong, each argued from a real citation read one step wider than the citation supported.

## What changed since round 4

1. **v5**, in `packages/qfai/tests/helpers/buildCommand.ts`, replacing four versions of an inline
   predicate. Shell segments before verbs; script **bodies** before names, resolved per manifest; a
   third verdict `heuristic` for a name-shaped guess. Corpora in `tests/unit/buildCommand.test.ts` —
   round 4's 20 regressions, v4's 15 kept forms, 18 accumulated non-builds, and both real workflow
   trees with the two opaque cases pinned as opaque.
2. **The third `ELOOP` site** (`stat`) guarded, and three tests for the loop, the cycle and the
   dangling link — round 4 found none existed. The oracle also found round 3's symlink test vacuous:
   it passed the link as the walk's root, so the branch under test was never reached.
3. **The ratchet no longer asserts the claim count at all.** `>= 208` reddened on the first ledger line
   removed, which is `CR-20260820-0011` option 1's own work.
4. **The matrix test pins the record's prose**: each class states the property the test enforces, and
   each justification body must carry a phrase only its own reason would use.
5. **`Blocked-By` column** in the handover table; `DR-ID` no longer carries a `CR-*`.
6. **NEW — `tests/assets/stageEvidenceCounts.test.ts`.** Every round found numbers in the record that
   the tree did not hold. This derives them: per-file test counts, annotated describes, the recorded
   guard output against the ledger, and the named packs against the review directory. It found a
   missing pack seal on its first run — from an edit that had aborted and written nothing, in a section
   this record had already reported as fixed.

## What I most want challenged

1. **Break v5, both directions.** Fifth version, third reported as clean. The corpora are the claim.
   Attack the per-manifest resolution, the `heuristic` verdict's boundary, and the real-tree
   expectation that four commands reach a build with two of them opaque.
2. **Break `stageEvidenceCounts.test.ts`.** It is a test about a record, which is the shape that has
   gone vacuous twice on this spec. Find a number it should catch and does not — or a way to satisfy it
   while the record still misstates the tree.
3. **Break the matrix pinning test a fourth time.**
4. **`DR-0017-0010`'s clause 1, third statement.** It now says **unsatisfied** — no tuning change has
   been made, so nothing exists for the clause to be true of — and that clause 1 is therefore
   falsifiable in principle once one does. Is that right, or is it the third wrong reading in a row?
5. **Re-derive every number.** Including the ones the new test does not cover: the suite totals, the
   `--profile full` count, the unscoped `QFAI-ATDD-112` breakdown (1/4/2/8 = 15), and the four seals.

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes.
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks from the index first.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`.
