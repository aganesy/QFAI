# 99 Delta

## Change History

| Date       | Change Type | Section                   | Summary                                                                                                        | Rationale                                                                                                    |
| ---------- | ----------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 2026-09-23 | adopted     | 01_Context, 05_Scope      | Remove C, the work-log surface; A and B stay (OQ-0001)                                                         | All four of the user's reasons: duplicated homes, poor use, upkeep, name collision                           |
| 2026-09-23 | adopted     | 06_REQ                    | Remove `QFAI-TDDLIST-015` and `QFAI-TDDLIST-016`; keep `TDDLIST_BLOCKED_MISSING_REF` (OQ-0002)                 | The `Blocked-By` target is the account of a stop                                                             |
| 2026-09-23 | adopted     | 06_REQ                    | Remove the handoff brief and `R-HANDOFF-INCOMPLETE` with no replacement (OQ-0003)                              | The user chose no replacement                                                                                |
| 2026-09-23 | adopted     | 06_REQ, 03_Story-Workshop | Other kinds go to `07_Decisions`, `08_Open-questions` or a Change Request; the skill text says where (OQ-0004) | Each kind already has a tracked home                                                                         |
| 2026-09-23 | adopted     | 06_REQ, 07_NFR            | Stop seeding and validating adopters' `.qfai/steering/`, leave the files, CHANGELOG note (OQ-0005)             | No adopter data is touched, and no new control is added                                                      |
| 2026-09-23 | adopted     | 06_REQ                    | Migrate this repository's unique entry content, then delete the directory (OQ-0006)                            | Nothing restated nowhere else is lost                                                                        |
| 2026-09-23 | adopted     | 06_REQ                    | The qfai-sdd approval stop writes nothing new (OQ-0007)                                                        | Triage `Approved By: -`, `QFAI-TRIAGE-005` and the stop report already record it                             |
| 2026-09-23 | adopted     | 06_REQ                    | Rewrite all three Change Requests that cite entry paths (OQ-0008)                                              | A pointer to a deleted file names nothing. The user overrode the recommendation to rewrite only the open one |
| 2026-09-23 | adopted     | 06_REQ, 09_Constraints    | One change carries the check removal, skill text, deletion, test and ledger-row removals, and re-pin (OQ-0009) | Tests and ledger rows fail validation when either goes without the other; the ratchet fails on a rise        |
| 2026-09-23 | adopted     | 06_REQ                    | Record the upstream conflicts as the Change Request `/qfai-sdd` raises (REQ-0016)                              | Changing settled specs and contracts is a Change Request; this stage edits none                              |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

Only options whose rejection changes what a later stage may do are listed.

| Date       | OQ-ID   | Rejected Option                                                                                                                 | Reason                                                                                                    | Recurrence Prevention                                               |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2026-09-23 | OQ-0001 | B (the four catalog files and Stage 0), A (legacy-layout cleanup), or renaming "steering" only                                  | The user chose C alone in round 1                                                                         | NFR-0001, NFR-0002, DTC-1: remove by symbol                         |
| 2026-09-23 | OQ-0002 | Requiring the account of a stop in the Change Request that `Blocked-By` names, or moving the requirement to `08_Open-questions` | The user chose to remove the check in round 3a                                                            | REQ-0004: a non-empty `Blocked-By` is the whole requirement         |
| 2026-09-23 | OQ-0003 | Moving the handoff brief to stage evidence, or adding a resume-notes section to `test-list.md`                                  | The user chose no replacement in round 3b; stage evidence is gitignored and local only                    | DTC-5; `05_Scope.md` item 6                                         |
| 2026-09-23 | OQ-0004 | Removing the surface with no guidance on where records go                                                                       | The user chose existing homes named in the skill text in round 3c                                         | REQ-0007 acceptance: each home appears in the skill that reaches it |
| 2026-09-23 | OQ-0005 | Leaving the files with a warning that the directory is no longer read                                                           | The user chose a CHANGELOG note in round 3d; a warning is a control the request did not ask for (AP-0005) | REQ-0010 acceptance: no finding names the directory                 |
| 2026-09-23 | OQ-0005 | `qfai init` deleting the directory                                                                                              | The user chose to leave the files; they are the adopter's                                                 | NFR-0003 hash test                                                  |
| 2026-09-23 | OQ-0006 | Deleting the entries as they are, or keeping them                                                                               | The user chose to move unique content first in round 4                                                    | REQ-0013 acceptance: each unique item is found in its target        |
| 2026-09-23 | OQ-0007 | Writing the approval stop to stage evidence                                                                                     | The user chose to stop recording it in round 5a; the run already leaves a record of the stop              | REQ-0008 acceptance: no stop text names a written record            |
| 2026-09-23 | OQ-0008 | Rewriting only the open Change Request, which was the recommended option                                                        | The user overrode the recommendation in round 5b and chose to rewrite all three                           | REQ-0014 lists the approved records among the lines to rewrite      |
| 2026-09-23 | OQ-0009 | Deleting the entries before the check (not put to the user; follows from OQ-0002 and OQ-0006)                                   | Raises `QFAI-TDDLIST-015` on spec-0003 and trips the ratchet (AP-0003)                                    | OC-1, REQ-0015                                                      |
| 2026-09-23 | OQ-0012 | Correcting the `.gitignore` claim in the records being superseded                                                               | Repairs a surface that is being deleted                                                                   | REQ-0016: the superseding record notes the contradiction            |

## Rejected Visual Directions

Not applicable: the pack is non-ui.

## Drift Events

None. No scope or direction changed after the session ended at
2026-09-23T07:08:14Z (SRC-0024).
