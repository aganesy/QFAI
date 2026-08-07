# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

`/qfai-sdd` seeds every row at Phase 2b, from three sources:

- **one row per coverage-target TC** in `06_Test-Cases.md`, carrying its
  `TC-Refs` — `Layer` `Unit` / `Component` / `Integration`;
- **one `Layer = E2E` row per `US-*`** the spec declares, carrying `US-Refs`;
- **one `Layer = API` row per declared `CON-API-*`**, carrying `CON-API-Refs`.

An empty table below is valid — it means the spec has no obligations yet, not
that the ledger is missing.

The last two groups exist because a `TC-*` annotation is forbidden in
`tests/e2e/**` and `tests/api/**`, so those rows have no legal `TC-Refs`
value and record their obligation in `US-Refs` / `CON-API-Refs` instead
(`qfai-implement/references/execution-ledger.md#obligation-columns-optional-required-by-layer`).
Without them, an all-`done` ledger can sit beside a `QFAI-ATDD-111` /
`QFAI-ATDD-113` hard gate at 0%.

**Who writes which row.** `/qfai-implement` drives the `Status`, `DR-ID` and
`Evidence` cells of the `Unit` / `Component` / `Integration` rows;
`/qfai-atdd` drives the same three cells of the `E2E` / `API` rows, whose
tests it authors. Exactly one skill owns any row. Neither adds, removes or
re-scopes one — that is `/qfai-sdd`'s, through the Change Request path.

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

| Column    | Description                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| TDD-ID    | `TDD-NNNN`, unique within this spec                                                                                               |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`                                                                                |
| TC-Refs   | Test cases from `06_Test-Cases.md`; `-` on `E2E` / `API` rows                                                                     |
| Test file | Project-root-relative path to the test module                                                                                     |
| Selector  | Test selector/description for targeted execution                                                                                  |
| Status    | `todo` / `blocked` / `red` / `green` / `refactor` / `review-fix` / `done` / `exception`                                           |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)                                                                             |
| Evidence  | The RED/GREEN outcome in one word each, plus an anchor into the stage's evidence file. **Not** the commands and output themselves |

Optional columns, required by layer or status:

| Column       | Description                                                           |
| ------------ | --------------------------------------------------------------------- |
| US-Refs      | `US-*` this row implements. Legal **only** on `Layer = E2E` rows      |
| CON-API-Refs | `CON-API-*` this row implements. Legal **only** on `Layer = API` rows |
| Blocked-By   | What a `blocked` row waits on. Required on those rows                 |

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
