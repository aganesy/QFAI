# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

Rows are derived from `06_Test-Cases.md`:
**one row per independently observable boundary of a coverage-target TC**.
A TC that names a single boundary owes exactly one row; a matrix-shaped TC
(several rejection reasons, a status-code matrix, several independent state
transitions) owes one row per boundary, and each of those rows carries that
`TC-*` in `TC-Refs`. `TC-Refs` is many-to-many, so several rows naming one
`TC-*` is the seeded shape, not a TC-coverage violation.

`/qfai-sdd` seeds them at Phase 2b — before RED begins, which is where
`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
requires the split. An empty table below is valid — it means the spec has no
coverage-target TC yet, not that the ledger is missing.

`US-*` and `CON-API-*` are **not** rows here. They are ATDD obligations,
traced by `QFAI:` annotations in the test tree per
`.qfai/assistant/catalog/test-layers.md`, and `/qfai-atdd` does not write to
this ledger.

A split row is identified by its `Boundary` cell — a short slug for the one
observable boundary the row owns, seeded at Phase 2b while `Test file` is still
`-`. `TDD-ID` is a serial and `TC-Refs` repeats identically across sibling rows,
so neither tells two rows of one `TC-*` apart, and `Selector` cannot either: it
is the runtime test name, which `/qfai-implement` rewrites when a review-fix
handback replaces the test. `Boundary` is written here and never rewritten
downstream, so the reseed matches on the (`TC-Refs`, `Boundary`) pair; matching
on `Selector` would read such a rename as one boundary dropped and another
added. It is the pair and not the slug alone: a slug is unique inside its own
`TC-*` and nowhere wider, so a generic one (`not-found`) recurs across TCs.

Reseeding is a **delta**, never a regeneration, and its unit is the boundary,
not the `TC-*`: a row whose boundary is unchanged keeps its `TDD-ID`, `Status`,
`Test file`, `Selector`, `DR-ID` and `Evidence`, and a boundary with no row yet
is appended at `Status = todo`. Rewriting a row that has already progressed
would destroy the RED/GREEN evidence that proves its cycle.

The delta runs in both directions. A boundary whose obligation changed has its
row returned to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*`
in `DR-ID`, prior `Evidence` kept).
A boundary dropped from a surviving TC has its row retired the same way,
and a TC deleted upstream, or no longer a coverage target, has every one of
its rows retired. Leaving a stale `done` row hides re-implementation work, and
leaving a `todo` row for a deleted boundary feeds `/qfai-implement` an
obligation that no longer exists.

A ledger seeded before this rule holds **one** row for a matrix-shaped TC and no
`Boundary` column.
Such a legacy aggregate row is not unchanged and the delta does not preserve it:
add the column and re-split it into one row per boundary. That migration is a
single re-scope and lands whole or not at all — appending the boundary rows
while the aggregate row still stands covers the TC twice, and
`/qfai-implement` would run the whole matrix as one RED before reaching the
split rows. Gate all of it on one approved `CR-*` that enumerates the aggregate
rows
(`.qfai/assistant/skills/qfai-implement/references/change-request-reset.md`),
and until approval change nothing here. Once approved: keep the aggregate row
only when its `Selector` names exactly one boundary — write that slug into
`Boundary` and reset a `Status` past `todo` — and retire it whenever it maps to
no single boundary, since a row without a `Boundary` stays selectable. A single
RED stops at the first failing assert, so an aggregate row's `Evidence` proves
no boundary in full.

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
reads it with `parseFirstMarkdownTable`. Keep it first; a table above it is
parsed as the ledger instead and raises eight
`TDDLIST_REQUIRED_COLUMN_MISSING` errors.

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Boundary |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | -------- |

## Schema

Required columns, in the order used above:

| Column    | Description                                                  |
| --------- | ------------------------------------------------------------ |
| TDD-ID    | `TDD-NNNN`, unique within this spec                          |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements       |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`           |
| Test file | Project-root-relative path to the test module                |
| Selector  | Test selector/description for targeted execution             |
| Status    | `todo` / `red` / `green` / `refactor` / `done` / `exception` |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)        |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle         |

Optional columns, appended after the required eight:

| Column       | Description                                               |
| ------------ | --------------------------------------------------------- |
| Boundary     | Stable slug for the one observable boundary this row owns |
| US-Refs      | E2E obligation, on an `E2E` row                           |
| CON-API-Refs | API obligation, on an `API` row                           |

`Boundary` is written by `/qfai-sdd` Phase 2b and by nothing else — paired with
`TC-Refs` it is what a reseed matches on, so `/qfai-implement` never rewrites it
even when a review-fix handback changes `Selector` or `Test file`. `validate`
requires it once a `TC-*` holds more than one row: siblings with no slug raise
`QFAI-TDD-003` (`warning`) and two siblings sharing one slug
raise `QFAI-TDD-004` (`error`).

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
