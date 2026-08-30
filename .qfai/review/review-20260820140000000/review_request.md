# Review request

- Stage: /qfai-implement (spec-0017, CHG-007 run)
- Unit: the rework of the previous round's findings, plus one newly implemented row (`TDD-0065`)
- Round: 5
- Evidence: `.qfai/evidence/implement-spec-0017.md`
- Revision under review: `bc36f08c`
- Ledger: `.qfai/specs/spec-0017/tdd/test-list.md` — 74 `refactor`, 8 `todo`

## Why this round exists

Round 4 put all three blocking reviewers on `0cd866e9` and all three returned REVISE. Thirteen
commits since then address every finding they raised. This round asks whether the rework holds and
whether anything it introduced is worse than what it fixed.

## What changed, by finding

| finding                    | what was done                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| H1 rename collapse         | `--no-renames` on the detect job's diff, plus a claim in `TDD-0008`                          |
| H2 conditional step        | hygiene lane property 3 rejects a verification item behind `if:`; claims in 0036 and 0059    |
| B4 annotation ledger       | 54 missing annotations appended; `QFAI-ATDD-112`'s spec-0017 population 63 -> 9              |
| B5 dangling anchors        | 68 of 73 evidence pointers did not resolve; explicit per-block anchors, now 0                |
| B7 borrowed RED            | 7 cells claimed a file-scoped RED they were not part of; 5 identified by re-running the seam |
| B6 no oracle for TDD-0008  | three rounds added; the first found the H1 claim itself vacuous                              |
| B1 undisclosed option A    | `CR-20260820-0002` now discloses that its option A is already the row's selector             |
| B2 upstream writes         | self-reported as `CR-20260820-0007`                                                          |
| B3 cross-spec              | `## Cross-spec obligations` names spec-0003 `TDD-0038`/`0039`/`0040`                          |
| B8 CR rerun plans          | all 12 CRs; 4 of them also lacked Impact / Decision needed / Resolution                      |
| gatekeeper trio and hashes | trio on 13 rows; the `mutant` column described as a fingerprint, not an address              |
| M1 / M2 / M3               | three lanes that reported PASS over nothing                                                  |
| M4 executables             | `.agents/**` executables no longer classify as documentation                                 |
| L1 / L2 / L4 / L6 / L10 / L11 / L12 | three unfalsifiable claims, four overstating comments, 16 bare `as`             |

New this round: `TDD-0065` implemented (a worker-setting timing artifact and six oracle rounds), and
every `todo` row's blocker recorded in its `DR-ID` and `Evidence` cells.

## What I want looked at hardest

1. **The claims added during the rework.** One of them — the `--no-renames` claim from H1 — was
   VACUOUS when committed, and only an oracle demanded by a different finding caught it. Assume the
   others may have the same defect. The rework added claims to `TDD-0008`, `TDD-0010`, `TDD-0036`,
   `TDD-0046`, `TDD-0057`, `TDD-0059`, `TDD-0065`, `TDD-0073`.
2. **`CR-20260820-0007`.** I wrote three decision records the skill forbids, self-reported it, and
   then found four `todo` rows whose acceptance criteria REQUIRE that write. Is the CR's framing
   right, and is leaving four rows `todo` the correct call rather than a way of avoiding work?
3. **`TDD-0065`'s artifact.** One run per setting, not a best-of-three, with the limitation stated.
   Is a 0.85% margin inside a 2% spread strong enough to place the adopted value, or is the row
   passing on noise?
4. **The corrections placed near the top of the evidence** rather than edited in place. Two
   statements were true when written and are not now. Is that the right treatment, or does it leave
   a reader of a per-change block misinformed?
5. **What the rework broke.** Thirteen commits touched the hygiene lane, the classifier, four test
   files, the ledger, the evidence record and eight CRs.

## Instructions given

- **No mutations.** Three agents share one working tree, and a mutation in a shared tree produced a
  false red in an earlier round. Read-only: run suites and gates, plant nothing.
- Concurrency is capped at three. Ten concurrent suite-running agents produced a false
  nondeterminism report in an earlier session.
- State the revision measured at. It is `bc36f08c` and the tree is clean.
- Write findings here, in the pack, not only in prose back to the orchestrator.
