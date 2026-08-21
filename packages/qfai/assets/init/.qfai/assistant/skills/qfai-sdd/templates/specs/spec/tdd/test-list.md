# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

Rows are derived from `06_Test-Cases.md`: **one row per coverage-target TC**.
`/qfai-sdd` seeds them at Phase 2b. An empty table below is valid — it means
the spec has no coverage-target TC yet, not that the ledger is missing.

`Tier` is seeded with the row, from its `Layer` and the criticality list in
`.qfai/assistant/skills/qfai-implement/references/volume-policy.md`. The stage
that fixes `Layer` already holds every input the derivation takes, and
`/qfai-implement` needs the answer before it starts the row — so it is declared
here and never written into `Evidence`.

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

| TDD-ID | TC-Refs | Layer | Tier | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | ---- | --------- | -------- | ------ | ----- | -------- |

## Schema

Columns, in the order used above. Every one but `Tier` is required:

| Column    | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| TDD-ID    | `TDD-NNNN`, unique within this spec                                |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements             |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`                 |
| Tier      | Review tier `T1` / `T2` / `T3` (`-` when undeclared, read as `T1`) |
| Test file | Project-root-relative path to the test module                      |
| Selector  | Test selector/description for targeted execution                   |
| Status    | `todo` / `red` / `green` / `refactor` / `done` / `exception`       |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)              |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle               |

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
