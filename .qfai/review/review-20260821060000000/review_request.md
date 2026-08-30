# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-5 repairs — v6 of the build classifier, the fixed derived-count test, the matrix
  test's header and refuted-figure pins, the corrected `DR-0017-0010` / `CR-20260820-0012`, the
  `## Ledger rows advanced` correction-at-source — plus one new artifact,
  `packages/qfai/tests/assets/retractedClaims.test.ts`
- Round: 6
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Rounds 1-5 each returned REVISE. Round 5's own verdicts: `qa-gatekeeper` 10 blocking,
`completion-reviewer` 7, P1d 3 — and P1d **released** one write, `todo -> blocked` for `TDD-0069`,
which is the first any gate has authorised.

Round 5's worst finding was that the test this stage added to stop bad numbers was **itself** red in a
required CI leg, by construction, while the record certified `exit 0` for it.

## What changed since round 5

1. **The red test is fixed and the rule is now two rules**: a **closed** pack needs a seal that
   **recomputes** (seals were previously counted, not compared); the **in-flight** pack is named
   without one, because a pack under review cannot be sealed and the request is committed before its
   reviewers launch.
2. **`countCases` was wrong twice** — 6 for its own 4-test file, then 8 for a 22-test file — and now
   counts statement-initial callsites, verified against five real files and a five-decoy fixture.
3. **v6 of the classifier.** A package manager resolves a **script**; a build tool takes a
   **subcommand**; a **missing** script can never exceed `heuristic`; a runner may nest; a tool's
   subcommand counts only before any flag. Round 5's ten defects and round 4's twenty are both in the
   committed corpus. No accuracy figure is recorded in the governance files, deliberately.
4. **The matrix test pins its header** (a ninth column was invisible) **and the absence of the refuted
   accuracy figure** (the paragraph written to discharge round 4 could be reverted silently).
5. **`## Ledger rows advanced`** is corrected at the source, and the "these are gone now" claim is
   replaced by a table of where each correction landed.
6. **NEW — `retractedClaims.test.ts`.** A claim a round refuted may appear only inside quotation
   marks. **Its first version was completely vacuous** — proximity to any corrective word, in a
   document about corrections — and reddened on none of six reinstated claims. Caught by running the
   oracle before shipping it; the enclosure version reddens on all six.

## What I most want challenged

1. **Break `retractedClaims.test.ts`.** It is the third record-checking test on this spec and the
   first two were each broken by a later round. Find a way to assert a retracted claim that survives
   it — a markdown blockquote, a fenced block, a table cell, a nested quote, an entry missing from the
   list.
2. **Break v6, both directions.** Sixth version, fourth reported clean. You chose the corpora that
   broke v3, v4 and v5; choose another.
3. **Break `stageEvidenceCounts.test.ts` again.** Round 5 broke it seven ways with a green control.
4. **Break the matrix test a fifth time.**
5. **Re-derive every number**, including the suite totals, `--profile full`, the five pack seals, and
   the unscoped `QFAI-ATDD-112` breakdown.
6. **`TDD-0070`'s remaining blocker.** P1d has refused `todo -> exception` five times, each time
   sustaining the row's account and failing the record around it. Say precisely what is left.

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes.
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks from the index first.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`.
