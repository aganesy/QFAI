# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-1 repairs — the withdrawn `US-0017-0007` claim, the new ledger guard, the
  behavioural `US-0017-0003` assertion, the rescored Coverage Depth Matrix and its pinning test, and
  the branch-3 routing of `TDD-0069` / `TDD-0070`
- Round: 2
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed
  before you launch**, and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Round 1 (`.qfai/review/review-20260820200000000/`) returned two REVISE verdicts:
`completion-reviewer` with 13 findings (B1-B5, M1-M4, m1-m4) and `qa-gatekeeper` with 5 blocking
findings. Every finding was verified independently and applied. **A stage does not review its own
repairs**, which is what this round is.

## What changed, and what I claim about each

1. **`US-0017-0007`'s claim withdrawn.** Its describe and its `tests/e2e/qfai-traceability.md` line
   are removed; a block comment records why in the file where the describe was. The scoped gate went
   back to `error=2`. I claim withdrawing beats strengthening because no honest assertion exists —
   the knobs do not ship.
2. **`scripts/check-atdd-annotation-ledger.mjs`** — the guard round 1 found did not exist, plus 10
   tests. Repo-wide it reports **127 of 208** ledger claims backed by no annotation in any E2E test
   file. `CR-20260820-0011`.
3. **`US-0017-0003` asserted behaviourally.** My first repair asserted over the step's text and was
   vacuous — `E6`/`E7` reddened nothing. Rewritten to extract the resolver's `run` body and execute it
   under bash with a stubbed `GITHUB_OUTPUT`. All three rounds now redden.
4. **The matrix rescored and pinned.** `✅ 3 / ⚠️ 1 / ❌ 5`; every `❌` cell partitioned into a named
   reason class; `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` derives the totals from the
   table. Seven falsification rounds redden, prose control green.
5. **`TDD-0069` / `TDD-0070` routed to branch 3** with row identity and obligation recorded before any
   gate routes, and the `DR-*` named as pending rather than invented.

## What I most want challenged

1. **Whether the new claims are vacuous.** This is the fourth round on this spec to find a vacuous
   claim inside the previous round's repairs, and the third was written minutes after applying a
   finding about exactly that. Assume `coverageDepthMatrix.test.ts` and the `US-0017-0003` behavioural
   assertion are vacuous until you have broken them yourself. **In particular**: does
   `checkLedger`'s repo-wide assertion (`unbacked.length > 100`) pin anything, or does it pass for any
   sufficiently broken ledger?
2. **The 127 number.** Verify it independently. I measured 127 unbacked across `tests/e2e/**` and
   `packages/qfai/tests/e2e/**`, and 126 across every test directory in the repository. If the guard
   over-reports — an annotation form it does not recognise, a directory it does not read —
   `CR-20260820-0011` is overstated and its recommendation is wrong.
3. **Whether withdrawing `US-0017-0007` was right.** The alternative was strengthening its assertion.
   I claim nothing assertable exists, because no knob file ships. **Challenge that**: is there an
   adopter-observable fact about parallelism that would discriminate?
4. **Branch 3 for `TDD-0069` / `TDD-0070`.** I claim branch 1 would put a permanently red test in the
   suite and branch 2 has no satisfied state to mutate, so branch 3 is forced — and that recording the
   determination breaks step 3b's deadlock without manufacturing provenance. Is a branch-3 entry whose
   `DR-*` is *pending* a valid entry, or is it the absent entry step 3b already stops on?
5. **The re-seal.** Round 1's pack was sealed at three files, then re-sealed at four after
   `summary.json` was written. I claim completing a pack with the artifact its layout contract requires
   is the legitimate case for superseding a seal. Say whether that reasoning would launder an
   illegitimate re-seal.
6. **The matrix rescoring direction.** `US-0017-0003` rose to `✅` and `US-0017-0004`'s oracle fell to
   `⚠️` — one up, one down, applied by the party the findings were against. Check both movements are
   on merit and not netting out.

## Instructions

- **No mutations.** Read-only: run suites and gates, plant nothing. Scratch under `tmp/` only, and
  revert any oracle mutation with a byte comparison.
- No `git checkout` / `stash` / `reset`. `validate` writes the TRACKED `.qfai/report/validate.log`;
  use a `git archive HEAD` shadow root if you need to run it, and note that `git archive` flattens
  this repository's 83 tracked symlinks, so re-materialise them from the index before taking any
  number (round 1's `qa-gatekeeper` found that).
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`.
