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

**Retiring a row means deleting it from the table.** There is no `retired`
status: the legal values are the eight the `Status` row of the schema table
below lists, and any other one is a `TDDLIST_INVALID_STATUS` **error** — so
writing `Status = retired`
fails the run that followed the instruction. Nor is there a parking spot lower
down: `validateTddList` scores **every** schema-complete table in this file, so
a row moved under a `## Retired` heading is still read as a ledger row, and a
trimmed-down copy of it raises `TDDLIST_REQUIRED_COLUMN_MISSING` instead.

Deleting the row destroys no evidence — `Evidence` is a pointer, and the
RED/GREEN record it names stays in the evidence file this row's `Layer` owns:
`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md`
for an `Integration`, `API` or `E2E` row.

Record the removal in the driving `CR-*`, which is where the deletion is
authorised: removing a row is an upstream change and takes the Change Request
path. Record it as `<spec-id>/TDD-NNNN` (`spec-0001/TDD-0001`) — `TDD-ID` is
unique only within its spec, so a CR retiring rows in two specs cannot tell
their two `TDD-0001`s apart once both rows are gone. A retired `TDD-ID` is
**never reused**: allocate the next one above the highest this spec has ever
issued, counting the ones its `CR-*` history retired, so a new row's `Evidence`
anchor cannot land on a retired cycle's `### TDD-NNNN` section
(`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`).

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
reads it with `parseFirstMarkdownTable`. Keep it first; a table above it is
parsed as the ledger instead and raises eight
`TDDLIST_REQUIRED_COLUMN_MISSING` errors.

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |

## Schema

Required columns, in the order used above:

| Column    | Description                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------- |
| TDD-ID    | `TDD-NNNN`, unique within this spec and never reused after retirement                           |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements                                          |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`                                              |
| Test file | Project-root-relative path to the test module                                                   |
| Selector  | Test selector/description for targeted execution                                                |
| Status    | `todo` / `blocked` / `red` / `green` / `refactor` / `review-fix` / `done` / `exception` — all 8 |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)                                           |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle                                            |

A `blocked` row also needs a `Blocked-By` column naming what it waits on;
without one the row raises `TDDLIST_BLOCKED_MISSING_REF`.

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
