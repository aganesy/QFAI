# 08 Glossary

## Term Definitions

| Term                        | Definition                                                                                                                                                                                                                                  | Context                                         | Source             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------ |
| work-log surface (C)        | The project-root directory `.qfai/steering/` of Markdown entries with YAML frontmatter, seeded by `qfai init` and read by `qfai validate`. Removed here                                                                                     | Every file in this pack                         | SRC-0001, SRC-0004 |
| work-log entry              | One `.qfai/steering/<id>.md` file. Its `kind` is one of `WORKLOG_ENTRY_KINDS`, for example `decision`, `blocker`, `handoff`, `consultation-needed`                                                                                          | This repository holds seven                     | SRC-0003, SRC-0014 |
| handoff brief               | A `kind: handoff` entry that must carry five sections, checked by `R-HANDOFF-INCOMPLETE`. Removed with no replacement                                                                                                                       | Not the `.qfai/handoff.yaml` feature            | SRC-0001, SRC-0003 |
| handoff feature             | `.qfai/handoff.yaml`, `handoffUpgrade.ts` and `R-HANDOFF-SCHEMA-DRIFT`. Unrelated to C and unchanged                                                                                                                                        | Named only to keep it out of the removal        | SRC-0005           |
| legacy assistant layout (A) | The retired `.qfai/assistant/steering/` tree that `qfai init --upgrade-assistant-tree` migrates. Unchanged                                                                                                                                  | `LEGACY_ASSISTANT_STEERING_DIR`                 | SRC-0003           |
| catalog steering files (B)  | `.qfai/assistant/catalog/{manifest,product,structure,tech}.md`, refreshed by the Stage 0 steering refresh. Unchanged                                                                                                                        | `ADOPTER_OWNED_ASSETS`                          | SRC-0006, SRC-0027 |
| stop                        | A ledger row set to `blocked`. Its `Blocked-By` cell names a Change Request, a contract path with line, or a cross-spec row, plus the status it left                                                                                        | `TDDLIST_BLOCKED_MISSING_REF` requires the cell | SRC-0026           |
| approval stop               | qfai-sdd halting before Phase 0 because an approval-required triage row has `Approved By: -`, reported by `QFAI-TRIAGE-005`                                                                                                                 | `--auto` and Stage 1                            | SRC-0007           |
| withdrawn governed asset    | A file under `.qfai/assistant/` a release stops shipping. `qfai validate` reports a remaining copy as `QFAI-ASSETS-006`; `qfai init --force` deletes a copy the lock records and that still matches, and leaves an edited or unrecorded one | `retireWithdrawnGovernedAssets`                 | SRC-0006           |
| dogfood ratchet             | `scripts/check-dogfood-backlog.mjs`: per-file error counts per profile may only fall, and a fall fails until re-pinned                                                                                                                      | `scripts/dogfood-backlog.json`                  | SRC-0016           |
| tombstone                   | A TDD-ID recorded under a ledger's `## TDD-ID reservations` so a deleted row's id is never reissued                                                                                                                                         | Drift protocol                                  | SRC-0017           |
| stage evidence              | `.qfai/evidence/<stage>-<target>.md`, the record of a stage run                                                                                                                                                                             | Home for content moved out of entries           | SRC-0015           |

## Abbreviations

| Abbreviation | Full Form                                      | Notes                                      |
| ------------ | ---------------------------------------------- | ------------------------------------------ |
| A            | Legacy assistant layout                        | `01_Context.md#Background`                 |
| B            | Catalog steering files                         | `01_Context.md#Background`                 |
| C            | AI work-log surface                            | The subject of this pack                   |
| CR           | Change Request (`.qfai/decisions/CR-*`)        | Approved before an upstream row is changed |
| DR           | Decision Record in `_policies/08_Decisions.md` | DR-0250..0260 establish C                  |

## Rules

- Terms must be used consistently across all discussion artifacts.
- Ambiguous or context-dependent terms should include usage context.
- "steering" alone is ambiguous in this repository. Write A, B or C, or the full
  term.
