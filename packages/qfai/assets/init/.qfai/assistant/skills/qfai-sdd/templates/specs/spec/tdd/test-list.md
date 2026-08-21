# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

`/qfai-sdd` seeds the rows at Phase 2b, in **three groups**:

- **one row per coverage-target TC** from `06_Test-Cases.md` — `Layer` from the
  TC's declared `Level`, obligation in `TC-Refs`;
- **one `Layer = E2E` row per active `US-*`** from `02_User-stories.md` —
  obligation in `US-Refs`, `TC-Refs` is `-`;
- **one `Layer = API` row per active `CON-API-*`** the spec declares —
  obligation in `CON-API-Refs`, `TC-Refs` is `-`.

Without the last two the ledger has nowhere to hold a `US-*` / `CON-API-*`
obligation, so an all-`done` ledger can sit beside a `QFAI-ATDD-111` /
`QFAI-ATDD-113` gate at 0% and still report itself complete.

**Active** is the exemption `.qfai/assistant/catalog/test-layers.md` already
defines: a spec that declares no user-facing surface owes no E2E reference for
its `US-*` (`QFAI-ATDD-111` does not fire for it), and a contract declaring
`x-qfai-status: planned` is excluded from `QFAI-ATDD-113`. Seeding an exempt
obligation would park a completion-prohibiting `todo` row on a test that must
not be written.

An empty table below is valid — it means the spec has no coverage-target TC and
no active `US-*` / `CON-API-*` yet, not that the ledger is missing.

The E2E and API rows are **tracked** here, not authored here. Their acceptance
tests are written by `/qfai-atdd` and their `Status` / `DR-ID` / `Evidence` are
advanced by `/qfai-implement`; the production behaviour a journey exercises is
normally delivered by this spec's own TC rows, so an E2E/API row is a coverage
obligation rather than the sole carrier of a feature. `/qfai-atdd` does not write to
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

The `US-*` and `CON-API-*` rows follow the same rule, with one extra trigger:
an obligation that **became exempt** — the spec stopped declaring a user-facing
surface, or its contract went back to `x-qfai-status: planned` — has its row
retired exactly like a deleted one, and an obligation that became active is
appended at `todo`.

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
reads it with `parseFirstMarkdownTable`. Keep it first; a table above it is
parsed as the ledger instead and raises eight
`TDDLIST_REQUIRED_COLUMN_MISSING` errors.

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ------- | ------------ |

## Schema

Required columns, in the order they lead the header above:

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

The two trailing columns are optional in the schema and **required by layer**.
They ship in the header above so a seeded E2E/API row's obligation always has a
home — a row of that layer with nowhere to record its `US-*` / `CON-API-*` is
unverifiable, which is the state the header used to leave it in:

| Column       | Description                                                               |
| ------------ | ------------------------------------------------------------------------- |
| US-Refs      | `US-NNNN` this row implements. Legal **only** on a `Layer = E2E` row      |
| CON-API-Refs | `CON-API-NNNN` this row implements. Legal **only** on a `Layer = API` row |

`.qfai/assistant/catalog/test-layers.md` forbids `TC-*` annotations in
`tests/e2e/**` and `tests/api/**`, so those rows carry `-` in `TC-Refs`;
`TDDLIST_OBLIGATION_LAYER_MISMATCH` enforces the binding in both directions.

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
