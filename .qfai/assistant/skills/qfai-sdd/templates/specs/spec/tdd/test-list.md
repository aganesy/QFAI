# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

Rows are derived from `06_Test-Cases.md`: **one row per coverage-target TC**,
plus **one `Layer = Integration` row per integration-level TC** — every `Level`
whose ATDD annotation routes to `tests/integration/**`: `L3`, `integration`, a
blank cell, a spelling that names no layer, and `system` / `acceptance`.
`/qfai-sdd` seeds both at Phase 2b.
An empty table below is valid — it means the spec declares neither yet, not that
the ledger is missing.

The two groups are exclusive, and membership is decided by **where the
annotation goes, not by whether the word is familiar**. `system` and
`acceptance` are the case that proves it: both are in the layer vocabulary, so
neither is unrecognised, and neither is unit or component — a spelling test puts
them in no group at all while `/qfai-atdd` still writes their tests. A TC whose
`Level` is blank **or unrecognised** belongs to the second for the same reason:
`QFAI-ATDD-112` routes every `Level` it cannot read to
`tests/integration/**`, so seeding it as a coverage-target row would have
`/qfai-implement` and `/qfai-atdd` each write a test for it — and
`TDDLIST_UNKNOWN_LEVEL` is a waivable `warning`, so nothing stops such a TC
arriving here unfixed. That one `Integration` row still covers the TC for
`TDDLIST_TC_NOT_COVERED`, which asks only that some row carry it in `TC-Refs`.

**"One row" is a floor, not a cap.** A TC that enumerates several rejection
reasons, a status-code matrix or independent state transitions is seeded one row
per independently observable boundary, all carrying that TC in `TC-Refs`
(`.qfai/assistant/skills/qfai-implement/references/selector-granularity.md`).
Splitting an `Integration` TC is Phase 2b's job: `/qfai-atdd` observes RED per
row and never writes this ledger.

An `Integration` row is ATDD-owned: `/qfai-atdd` authors its test and its RED
provenance, and the row's `Evidence` anchors into
`.qfai/evidence/atdd-<spec-id>.md`
(`.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`).
Seeding it is still Phase 2b's work — no validator asks for it, so leaving it
to a gate leaves the whole integration layer outside the micro-cycle.

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
`DR-ID`, prior `Evidence` kept); a TC deleted upstream, or whose `Level` moved
to a layer this ledger does not seed, has its row retired the same way. Leaving
a stale `done` row hides re-implementation work, and leaving a `todo` row for a
deleted TC feeds `/qfai-implement` an obligation that no longer exists.

Retirement is keyed on the TC, not on coverage-target status. A row whose TC is
still declared at `L3` is a row Phase 2b seeds today: **do not retire it for
not being a coverage target**. That reading would sweep away every existing
`Layer = Integration` row, evidence and all.

**Within a TC it is keyed on the boundary.** A matrix-shaped TC holds one row
per independently observable boundary, so re-derive that set: a boundary the TC
has gained is appended at `todo`, and the rest are reset. Reconciling per TC
alone leaves a TC that drops from three boundaries to two holding all three rows
— the TC is still declared and still `L3`, so no retirement rule fires, and the
changed-TC reset hands the third row back as selectable work for behaviour the
spec no longer states.

**`Selector` is not that key.** The executing stage is authorised to fill a
placeholder selector and to repair an unresolvable one, so a row seeded with a
descriptive selector holds the test's real title once its cycle has run. A
string comparison against the spec therefore reports every implemented boundary
as deleted, and retiring on it discards a `done` row's `TDD-ID`, `Status` and
`Evidence` for behaviour that never changed. Retire on this rule only a row
still at `Status = todo` whose seeded selector names a boundary the TC no longer
declares; when the re-derived set is smaller than the TC's rows that have
already progressed, stop and raise a `CR-*` instead. Which implemented
obligation the spec dropped belongs to the change record, and `TDD-ID` is the
only identity on these rows that nothing downstream rewrites.

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
reads it with `parseFirstMarkdownTable`. Keep it first; a table above it is
parsed as the ledger instead and raises eight
`TDDLIST_REQUIRED_COLUMN_MISSING` errors.

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |

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

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
