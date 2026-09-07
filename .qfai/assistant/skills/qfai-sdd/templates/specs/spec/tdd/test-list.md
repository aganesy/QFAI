# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

`/qfai-sdd` seeds the rows at Phase 2b, in **four groups**:

- **one row per coverage-target TC** from `06_Test-Cases.md` — `Layer` from the
  TC's declared `Level`, obligation in `TC-Refs`;
- **one `Layer = Integration` row per integration-level TC** from the same file
  — every `Level` whose ATDD annotation routes to `tests/integration/**`: `L3`,
  `integration`, a blank cell, a spelling that names no layer,
  and `system` / `acceptance`; obligation in `TC-Refs`;
- **one `Layer = E2E` row per active `US-*`** from `02_User-stories.md` —
  obligation in `US-Refs`, `TC-Refs` is `-`;
- **one `Layer = API` row per active `CON-API-*`** the spec **owns** —
  obligation in `CON-API-Refs`, `TC-Refs` is `-`.

Without the E2E / API groups the ledger has nowhere to hold a `US-*` /
`CON-API-*` obligation, so an all-`done` ledger can sit beside a
`QFAI-ATDD-111` / `QFAI-ATDD-113` gate at 0% and still report itself complete.
Without the integration group an integration-level TC has no row at all, and
nothing reports its absence — the whole integration layer then sits outside the
micro-cycle while `validate` stays quiet.

The two TC groups are exclusive, and membership is decided by **where the
annotation goes, not by whether the word is familiar**. `system` and
`acceptance` are the case that proves it: both are in the layer vocabulary, so
neither is unrecognised, and neither is unit or component — a spelling test puts
them in no group at all while `/qfai-atdd` still writes their tests. A TC whose
`Level` is blank **or unrecognised** belongs to the integration group for the
same reason: `QFAI-ATDD-112` routes every `Level` it cannot read to
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

An `Integration` row is ATDD-owned on the same terms an `E2E` one is:
`/qfai-atdd` authors its test and its RED provenance, and the row's `Evidence`
anchors into `.qfai/evidence/atdd-<spec-id>.md`
(`.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`).

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

An empty table below is valid — it means the spec has no coverage-target TC, no
integration-level TC and no active `US-*` / `CON-API-*` yet, not that the ledger
is missing.

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
`DR-ID`, prior `Evidence` kept); a TC deleted upstream, or whose `Level` moved
to a layer this ledger does not seed, has its row retired the same way. Leaving
a stale `done` row hides re-implementation work, and leaving a `todo` row for a
deleted TC feeds `/qfai-implement` an obligation that no longer exists.

Retirement is keyed on the TC, not on coverage-target status. A row whose TC is
still declared at `L3` is a row Phase 2b seeds today: **do not retire it for
not being a coverage target**. That reading would sweep away every existing
`Layer = Integration` row, evidence and all.

**A move between the two seeded groups is a reclassification, not a reset.**
Both `L1`/`L2` and `L3` are seeded here, so a `Level` that crosses between them
retires nothing and only the changed-TC reset fires — and that writes `Status`
and `DR-ID`, never `Layer`, `Test file`, `Selector` or the evidence home. Left
there, a now-`L1` TC keeps an ATDD-owned `Integration` row waiting on a handoff
nothing will send, and a now-`L3` TC keeps a coverage-target row while both
skills author a test for it. A row still at `todo` is retired and re-seeded in
the new group; a row past `todo` **stops for a `CR-*`**, because its `Evidence`
addresses the previous owner's file and this delta keeps prior `Evidence`.

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
