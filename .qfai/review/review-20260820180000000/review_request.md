# Review request

- Stage: /qfai-implement (spec-0017, CHG-007 run)
- Unit: the rework of round 5's findings
- Round: 6
- Evidence: `.qfai/evidence/implement-spec-0017.md`, `.qfai/evidence/timing-workers-spec-0017.md`
- Revision under review: `<the commit that adds this file>` — see "Revision discipline" below
- Ledger: 74 `refactor`, 6 `blocked`, 2 `todo`

## Revision discipline, and my failure at it last round

Round 5's request named `bc36f08c` and I then committed the request itself, moving HEAD to
`90a33ee5` while all three of you were starting. Worse, I edited five source files at 15:02–15:04
while `qa-gatekeeper` was mid-run, after telling all three of you not to mutate the shared tree.
It pinned its ruling and said so, which is what saved the round.

This round: **this file is committed BEFORE any of you is launched, and I will not touch the tree
until all three reports are in.** Take `git rev-parse --short HEAD` at your start as the revision;
it will not move. If it does, that is a finding and I want it reported as one.

## What changed since round 5

Twenty-two findings across the three reports. Every one is either fixed or filed:

| finding                       | disposition                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| F1 retry scan                 | fixed — both `--retry 2` and `--retry=2` now redden; command text gathered structurally |
| F3 classifier reason          | fixed — an ordinary source path says `source path` again                     |
| F4 loader check vacuous       | fixed — narrowed to `path.join` resolution sites; oracles V1/V2/V3            |
| F6 duplicate helpers          | fixed — `isPlainRecord` and `stepsOfJob` removed                             |
| F8 planted tree stripped      | fixed — predicate + `filter`; verified nothing lost                          |
| BL-3 blocker in `DR-ID`       | fixed — `Blocked-By` column added, six rows moved to `blocked`; warning 358 -> 352 |
| B7's other half               | fixed — `TDD-0012`, and closed generally by a mechanical sweep of all twelve RED groups |
| BL-4, BL-5, F2                | fixed — three CR content errors                                              |
| BL-7 four sections            | fixed — `Objective`, `Items processed`, `Test results summary`, `Commands executed` |
| item 6 refactor verify        | fixed — six pairs, measured at HEAD                                          |
| items 7/8/11 verdicts         | fixed — round 5's three REVISE verdicts recorded with their revision          |
| BL-9 cross-spec fields        | fixed — all seven                                                            |
| BL-10 paraphrase              | fixed — the verbatim lane output, counting done openly beside it              |
| G1 4424 vs 4426               | fixed — re-measured and dated                                                |
| G13 needle/replacement scope  | fixed — narrowed to the one table it holds for                               |
| Class `ambiguity`             | fixed — six CRs to `intent`, the legal value                                 |
| rerun mode                    | fixed — all fifteen CRs name one, or say why none applies                    |
| item 10 stale locators        | **measured and recorded, not fixed** — see below                             |
| BL-1 per-item sections        | **filed as `CR-20260820-0008`** — see below                                  |
| BL-2 rounds 1-4 packs         | **not repairable** — recorded as a gap                                       |
| item-12 clause 1              | **not repairable** — recorded                                                |
| "five DR entries"             | **reviewer was wrong** — three entries, five ids mentioned; verified and recorded |

## What I most want challenged

1. **The three items I declined to fix.** Each has a stated reason and I would rather be told the
   reason is wrong than have it stand unchallenged:
   - **item 10.** 74 locators, 18 landing on an assertion at HEAD. I recorded the measurement and a
     policy — the prose claim identity is durable, the `:line:col` addresses that block's landing
     revision — and deferred the re-run to the closing revision, citing `evidence-revision.md`'s
     "measure at the tip, then commit the record and the `done` transition together". Is deferring
     legitimate, or is that rule about something else?
   - **BL-1.** `CR-20260820-0008` argues the per-item section contract and a file-scoped RED cannot
     both be honoured. Is the conflict real, or is option 2 (stub sections cross-referencing the
     shared pair) simply the answer?
   - **item-12 clause 1** and **BL-2**: both claimed unrepairable. Check that claim.
2. **Everything the rework touched, for the third time.** Rounds 4 and 5 each found vacuous claims
   IN THE PREVIOUS ROUND'S FIXES — H1's `--no-renames`, L2's loader check, L10's retry scan. That is
   three for three. Assume this round's fixes carry the same defect until you have checked. The
   claims changed are in `TC-0017-0014`, `TC-0017-0068`, `TC-0017-0079`, and the classifier's
   executable branch.
3. **The `Blocked-By` migration.** It added a column to an 82-row table and moved six statuses. Check
   that no other cell moved, that the six are the right six, and that `TDD-0069`/`TDD-0070` staying
   `todo` is right — my reasoning is that `Blocked-By` has no legal value for "waiting on post-merge
   CI history", so `blocked` would be an error.
4. **Whether any row may now reach `done`.** That is this round's actual question. If not, say which
   gate item holds it and whether the holder is repairable by me or needs a decision.

## Instructions

- **No mutations.** Read-only: run suites and gates, plant nothing. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`.
- State the revision you measured at, and confirm `git status --porcelain` was empty at start.
- Write findings into this pack, not only in prose back to the orchestrator.
- Where you contradict a measurement in the record, say how you measured. Two of you did that last
  round and both were right.
