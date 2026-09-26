# 12 OQ Resolution Log

## Resolution Timeline

Times of the two confirmations are in SRC-0024, `## Grilling Session`: rounds 1
to 4 at 2026-09-23T06:33:23Z, round 5 and its consequences at
2026-09-23T07:08:14Z.

| Date       | OQ-ID   | Action   | Summary                                                                                                                                                            | Evidence                                      |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| 2026-09-23 | OQ-0001 | created  | Which "steering" is removed, and why                                                                                                                               | SRC-0024 rounds 1 and 2                       |
| 2026-09-23 | OQ-0001 | resolved | Remove C, the work-log surface. All four reasons adopted. chosen_by: user, rounds 1 and 2                                                                          | SRC-0024 rounds 1 and 2                       |
| 2026-09-23 | OQ-0002 | created  | Fate of `QFAI-TDDLIST-015`                                                                                                                                         | SRC-0024 round 3a                             |
| 2026-09-23 | OQ-0002 | resolved | Remove the check, and with it `QFAI-TDDLIST-016`. The `Blocked-By` target is the account of a stop. `TDDLIST_BLOCKED_MISSING_REF` stays. chosen_by: user, round 3a | SRC-0024 round 3a                             |
| 2026-09-23 | OQ-0003 | created  | Fate of the handoff brief                                                                                                                                          | SRC-0024 round 3b                             |
| 2026-09-23 | OQ-0003 | resolved | Remove it and `R-HANDOFF-INCOMPLETE` with no replacement. chosen_by: user, round 3b                                                                                | SRC-0024 round 3b                             |
| 2026-09-23 | OQ-0004 | created  | Where the other kinds of record go                                                                                                                                 | SRC-0024 round 3c                             |
| 2026-09-23 | OQ-0004 | resolved | Existing homes: `07_Decisions` or a Change Request; `08_Open-questions` or a Change Request. The skill text says where. chosen_by: user, round 3c                  | SRC-0024 round 3c                             |
| 2026-09-23 | OQ-0005 | created  | Adopters' existing `.qfai/steering/`                                                                                                                               | SRC-0024 round 3d                             |
| 2026-09-23 | OQ-0005 | resolved | Stop seeding and validating, leave the files, CHANGELOG migration note. No new warning code. chosen_by: user, round 3d                                             | SRC-0024 round 3d                             |
| 2026-09-23 | OQ-0006 | created  | This repository's seven entries                                                                                                                                    | SRC-0024 round 4                              |
| 2026-09-23 | OQ-0006 | resolved | Move content restated nowhere else into the Change Request or evidence each entry points to, then delete the directory. chosen_by: user, round 4                   | SRC-0024 round 4                              |
| 2026-09-23 | OQ-0007 | created  | What replaces the qfai-sdd approval-stop `consultation-needed` entry                                                                                               | SRC-0024 round 5a; SRC-0007 reflection        |
| 2026-09-23 | OQ-0007 | resolved | Nothing. Triage `Approved By: -`, `QFAI-TRIAGE-005` and the stop report are the record. chosen_by: user, round 5a                                                  | SRC-0024 round 5a                             |
| 2026-09-23 | OQ-0008 | created  | Change Requests that cite entry paths                                                                                                                              | SRC-0024 round 5b; SRC-0015 reflection        |
| 2026-09-23 | OQ-0008 | resolved | Rewrite all three to point where the content moved. chosen_by: user, round 5b, against the recommendation to rewrite only the open one                             | SRC-0024 round 5b                             |
| 2026-09-23 | OQ-0009 | created  | Whether the removal lands in one change                                                                                                                            | SRC-0024; AP-0003                             |
| 2026-09-23 | OQ-0009 | resolved | One change: check removal, skill text, directory deletion, dogfood re-pin. chosen_by: user, confirmed with round 5                                                 | SRC-0024 confirmation at 2026-09-23T07:08:14Z |
| 2026-09-23 | OQ-0010 | created  | Exact rows `/qfai-sdd` supersedes, and the TDD-IDs it tombstones                                                                                                   | SRC-0009, SRC-0010, SRC-0017                  |
| 2026-09-23 | OQ-0010 | deferred | To `/qfai-sdd` Stage 1 triage for this removal. REQ-0016 fixes the scope                                                                                           | `13_Deferred.md`                              |
| 2026-09-23 | OQ-0011 | created  | Release version and SemVer level                                                                                                                                   | SRC-0020, SRC-0021                            |
| 2026-09-23 | OQ-0011 | deferred | To the user, when the release that carries the change is prepared                                                                                                  | `13_Deferred.md`                              |
| 2026-09-23 | OQ-0012 | created  | Correct the claim that `.qfai/steering/` is gitignored by default                                                                                                  | SRC-0013 reflection                           |
| 2026-09-23 | OQ-0012 | rejected | Moot on removal. The superseding record notes the contradiction instead                                                                                            | SRC-0013 reflection `action: reject`          |
| 2026-09-23 | OQ-0013 | created  | Fate of the tracked `.qfai/report/validate.spec-0017.json`                                                                                                         | SRC-0029                                      |
| 2026-09-23 | OQ-0013 | deferred | To the Change Request's file inventory at `/qfai-sdd` Stage 1                                                                                                      | `13_Deferred.md`                              |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
