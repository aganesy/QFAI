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
- **one `Layer = API` row per active `CON-API-*`** the spec **owns** —
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

**The surface exemption applies only where surface typing is in use.**
`test-layers.md` scopes `QFAI-ATDD-111` by surface type only when at least one
spec in this project declares a UI-bearing surface. A project that has never
declared one has not opted in, the obligation stays project-wide, and **every**
`US-*` is therefore active — applying the exemption there drops every E2E row
and leaves a gate that never clears.

**Which ledger an API row goes in.** `.qfai/contracts/**` has no spec owner in
the model, so ownership is mechanical: a spec **owns** a `CON-API-*` that its
own `spec-*/01..10` or `16_*` files name, and when several name it the
**lowest-numbered** owning spec holds the single row while the others record it
as a cross-spec obligation. Never write the same `CON-API-*` row into two
ledgers. A `CON-API-*` no spec names has no owner and gets no row until
Phase 2c gives it one.

An empty table below is valid — it means the spec has no coverage-target TC and
no active `US-*` / `CON-API-*` yet, not that the ledger is missing.

`Tier` is seeded with the row, from its `Layer`, what the item touches
(infrastructure, a public API surface, a `CON-*` contract or persisted schema →
`T2`; UI behavior or rendered output → `T3`) and the criticality list in
`.qfai/assistant/skills/qfai-implement/references/volume-policy.md`. `Layer`
alone does not decide it: a `Unit` row over persisted schema and a `Component`
row over rendered output are `T2` and `T3`. The stage that fixes `Layer` already
holds every input the derivation takes, and `/qfai-implement` needs the answer
before it starts the row — so it is declared here and
never written into `Evidence`.

The E2E and API rows are **tracked** here, not authored here. Their acceptance
tests are written by `/qfai-atdd` and their `Status` / `DR-ID` / `Evidence` are
advanced by `/qfai-implement`; the production behaviour a journey exercises is
normally delivered by this spec's own TC rows, so an E2E/API row is a coverage
obligation rather than the sole carrier of a feature. `/qfai-atdd` does not write to
this ledger.

**A seeded E2E/API row's `Test file` and `Selector` start at `-`, and
`/qfai-implement` fills them.** The acceptance test does not exist when Phase 2b
runs, so that phase invents no path for it. `/qfai-atdd` writes the test and
records its path and selector as the row identity in its handoff entry — the one
place they exist before this ledger has them — and `/qfai-implement` Phase Red
step 3b copies both into the row in the same edit that moves it out of `todo`.
Naming no writer for the two cells left them at `-` for the row's whole life:
the `green` existence check has no test to run, and the reviewer's identity
check has nothing to compare.

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

| TDD-ID | TC-Refs | Layer | Tier | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs | Owning module |
| ------ | ------- | ----- | ---- | --------- | -------- | ------ | ----- | -------- | ------- | ------------ | ------------- |

## Schema

The ledger schema — required columns, the optional `US-Refs` / `CON-API-Refs` /
`Blocked-By` / `Owning module` columns, the `Status` vocabulary, and the
`Evidence` cell contract — is defined in
`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`.

Do not restate it here. A second copy has nothing keeping it honest: it drifts
silently away from the rules `validateTddList` enforces, and an author filling
this ledger reads the copy, not the rules.
