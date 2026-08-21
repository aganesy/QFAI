# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

Rows are derived from `06_Test-Cases.md`: **one row per coverage-target TC**.
`/qfai-sdd` seeds them at Phase 2b. An empty table below is valid — it means
the spec has no coverage-target TC yet, not that the ledger is missing.

`US-*` and `CON-API-*` are **not** rows here. They are ATDD obligations,
traced by `QFAI:` annotations in the test tree per
`.qfai/assistant/catalog/test-layers.md`, and `/qfai-atdd` does not write to
this ledger.

Reseeding is a **delta**, never a regeneration: an unchanged TC's row keeps its
`TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`, and TCs
with no row yet are appended at `Status = todo`. Rewriting a row that has
already progressed would destroy the RED/GREEN evidence that proves its cycle.

The delta runs in both directions. A TC whose obligation changed has its row
returned to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in
`DR-ID`, prior `Evidence` kept); a TC deleted upstream, or no longer a
coverage target, has its row retired the same way. Leaving a stale `done` row
hides re-implementation work, and leaving a `todo` row for a deleted TC feeds
`/qfai-implement` an obligation that no longer exists.

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
reads it with `parseFirstMarkdownTable`. Keep it first; a table above it is
parsed as the ledger instead and raises eight
`TDDLIST_REQUIRED_COLUMN_MISSING` errors.

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |

## Schema

Required columns, in the order used above:

| Column    | Description                                                                             |
| --------- | --------------------------------------------------------------------------------------- |
| TDD-ID    | `TDD-NNNN`, unique within this spec                                                     |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements                                  |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`                                      |
| Test file | Project-root-relative path to the test module                                           |
| Selector  | Test selector/description for targeted execution                                        |
| Status    | `todo` / `blocked` / `red` / `green` / `refactor` / `review-fix` / `done` / `exception` |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)                                   |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle                                    |

Optional columns. They are not in the header above — add the column to the
ledger before writing a value that needs it:

| Column       | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| US-Refs      | The E2E user-story obligations this row implements             |
| CON-API-Refs | The API contract obligations this row implements               |
| Blocked-By   | What a `blocked` row is waiting on. **Required** on those rows |

`Status = blocked` without a `Blocked-By` column raises
`TDDLIST_BLOCKED_MISSING_REF` (`error`), so add the column in the same edit.
`blocked` means "cannot be started". It is completion-prohibiting and is
never selected by Phase Red — not a parking status like `exception`, which
demands a `DR-ID` and satisfies spec completion. `review-fix` is the state a
row holds while reworking a blocking reviewer's REVISE.

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
