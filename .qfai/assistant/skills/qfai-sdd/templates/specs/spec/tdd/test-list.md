# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

Rows are derived from `06_Test-Cases.md`: **one row per coverage-target TC**,
plus **one `Layer = Integration` row per integration-level (`L3`) TC**.
`/qfai-sdd` seeds both at Phase 2b. An empty table below is valid — it means
the spec declares neither yet, not that the ledger is missing.

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
