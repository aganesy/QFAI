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

| TDD-ID | TC-Refs | BR-Ref | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ------ | ----- | --------- | -------- | ------ | ----- | -------- |

## Schema

Columns, in the order used above. Every one except `BR-Ref` is required by
`npx qfai validate`; `BR-Ref` is **optional to the validator and required for T1
batching**, so a ledger seeded before the column existed keeps validating
unchanged. Seed it here anyway — this is the only phase that can resolve it,
and `/qfai-implement` can close no T1 review group without it.

| Column    | Description                                                  |
| --------- | ------------------------------------------------------------ |
| TDD-ID    | `TDD-NNNN`, unique within this spec                          |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements       |
| BR-Ref    | The one `BR-*` this row serves — the T1 review-group key     |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`           |
| Test file | Project-root-relative path to the test module                |
| Selector  | Test selector/description for targeted execution             |
| Status    | `todo` / `red` / `green` / `refactor` / `done` / `exception` |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)        |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle         |

`BR-Ref` is resolved here because this is the only phase where `03`, `04`, `05`
and `06` are all open: read each TC's `EX-Ref` in `06_Test-Cases.md` and that
`EX`'s `BR-Ref` in `05_Examples.md` — the edge that names the rule the test
verifies — taking every `BR-*` listed there when one `EX` covers a cohesive
rule bundle. Only a TC with no `EX-Ref` falls back to its `AC-Refs` and every
`BR` whose `AC-Refs` names one of them in `04_Business-Rules.md`. Then take the
union of everything reached and keep the **lowest-numbered** `BR-*` of it —
across several `TC-Refs` and across a multi-`BR` `EX` alike — so the key is the
same for whoever resolves it next. Write `-` when no `BR` reaches the row. An
empty cell reads the same as `-`, and that row is reviewed alone.
`npx qfai validate` recomputes this same derivation and reports
`QFAI-BRREF-003` when the cell holds a different rule, so a key
resolved by any other route is named rather than silently regrouping rows.
`/qfai-implement` batches its T1 reviews on this value and can close no group
without it. It is derived from upstream, not from run state, so a reseed
re-resolves it — that is not the row rewrite the delta rule forbids.

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
