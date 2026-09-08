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

A **matrix-shaped TC takes more than one row**: many rejection reasons, a
status-code matrix or several independent state transitions are split into one
row per independently observable boundary, each carrying that `TC-*` in
`TC-Refs` (`TC-Refs` is many-to-many with `TDD-ID`). A single test function can
fail only once, so a row that conflates boundaries leaves every assertion behind
the first unobserved on every RED run. Phase 2b is the only phase that may add
or re-scope a row, so a shape left un-split here reaches `/qfai-implement`,
which owns cells and not rows and can only send it back as a Change Request.

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

**Retiring a row means deleting it from the table.** There is no `retired`
status. The legal values are the eight
`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`
lists — this file states the schema nowhere, on purpose (see `Schema`, below) —
and any other one is a `TDDLIST_INVALID_STATUS` **error**, so writing
`Status = retired` fails the run that followed the instruction. Nor is there a parking spot lower
down: `validateTddList` scores **every** schema-complete table in this file, so
a row moved under a `## Retired` heading is still read as a ledger row, and a
trimmed-down copy of it raises `TDDLIST_REQUIRED_COLUMN_MISSING` instead.

**Deleting the row does not delete the test it drove.** Before removing a row
whose `Test file` and `Selector` name a test that already exists, assign that
test an owner in the same record, as an explicit downstream action: delete the
test, or re-point it at a surviving obligation (another row's `TDD-ID`, or a
`QFAI:` ATDD annotation per `.qfai/assistant/catalog/test-layers.md`).
`/qfai-sdd` does not edit test code and `/qfai-implement` only selects rows the
ledger still holds, so a test left unassigned has no owner at all: it keeps
asserting a retired behaviour until some later change makes the full suite fail,
with nothing left to trace it back to. When the `Test file` is shared with live
rows, delete only the named selector and re-check that the selectors those rows
still name are present in the file afterwards.

Record the removal where the authorisation for it already lives. Which record
that is depends on how the reseed was reached:

- **Normal `/qfai-sdd` reseed, TC deleted upstream.** The `UPDATE:REMOVE` Triage
  row was approved by AskUserQuestion and persisted to `09_delta.md`
  (`_policies/10_delta.md` for a cross-spec row), so that row is the record and
  Phase 2b just carries out what it approved.
  Do not open a `CR-*` for a deletion Triage already approved.
- **Normal `/qfai-sdd` reseed, TC no longer a coverage target.** The TC itself
  survives with a changed `Level`, so Triage emits `UPDATE:MODIFY` for it and no
  `UPDATE:REMOVE` row exists to point at. That `UPDATE:MODIFY` row is the
  record: name the retired `<spec-id>/TDD-NNNN` in it, together with the
  coverage change that dropped the row. `UPDATE:MODIFY` is approval-free **as an
  operation** — deleting a ledger row never is, so take the operator's approval
  for the deletion itself and record the approver in that row's `Approved By`
  cell, exactly as an `UPDATE:REMOVE` row carries one. Approved there, the row
  is the record and this path opens no `CR-*` either — do not attach the
  deletion to an `UPDATE:REMOVE` row that was never raised. Left unapproved it
  carries no authorisation for the deletion at all, and the row falls back to
  the Change Request path below.
- **Drift Protocol owner rerun.** No Triage ran, so the driving `CR-*` is the
  record: outside a `/qfai-sdd` reseed, removing a row is an upstream change
  and takes the Change Request path.

Record it as `<spec-id>/TDD-NNNN` (`spec-0001/TDD-0001`) — `TDD-ID` is unique
only within its spec, so one record retiring rows in two specs cannot tell
their two `TDD-0001`s apart once both rows are gone. A retired `TDD-ID` is
**never reused**: allocate the next one above the highest this spec has ever
issued, counting the ones those retirement records name, so a new row's
`Evidence` anchor cannot land on a retired cycle's `### TDD-NNNN` section
(`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`).

Copy the deleted row's `Evidence` cell into that record verbatim. The cell is a
pointer into the evidence file this row's `Layer` owns —
`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md`
for an `Integration`, `API` or `E2E` row — and the QFAI-managed `.gitignore`
block re-includes both by name, so the pointer still resolves in a clean
checkout, on CI and for a second operator. The body stays where it was written;
the record carries the reference to it, and the cycle's audit trail survives the
row.

**A row that never ran has no such section — read the cell to know.** Only
`green`, `refactor`, `review-fix` and `done` are asked for a command and its
result, so a row retired outside those four may hold an empty `Evidence` cell
or a bare dash, and the `### TDD-NNNN` it would anchor to does not exist. Write
that down as what it is, `no evidence — retired at Status = <status>, never
executed`, and delete the row on it.

**The status alone does not settle it.** A row reaches `blocked` or `exception`
from any state, so one blocked out of `green` or `refactor` carries the rounds
it already took and an anchor that still resolves; its `Blocked-By` names the
status it left from. Transcribe what such a row's cell points at, exactly as
for a `done` row. Never compose a section so the record has something to point
at, and never hold a retirement open waiting on evidence a `todo` row was never
going to produce.

**Nothing beyond the pointer goes into `_policies/10_delta.md`.** When the
approving Triage row is the cross-spec one persisted there, that file is barred
from carrying spec-local `US` / `AC` / `BR` / `EX` / `TC` IDs, and the
layered-traceability scan exempts only the cells of the canonical `## Triage`
table — anything written beneath or beside that table stays visible to it and
raises `QFAI-LAYER-100` / `TRACE_SHARED_SCOPE_VIOLATION` at `error`. Pasting an
evidence body there always trips it, because the `### TDD-NNNN` contract
requires the row's own `TC-ref` / `US-ref` / `CON-API-ref`; and it would not
survive a table cell in any case, since a GFM cell is one physical line and ends
at every unescaped `|`. Keep the `Evidence` pointer in the Triage row's
`Rationale` cell, which the scan does exempt, and leave the section it names in
the evidence file.

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
takes it with `parseFirstMarkdownTable`. Keep it first: a table above it is
read as the ledger instead and raises eight `TDDLIST_REQUIRED_COLUMN_MISSING`
errors.

Position is not the whole rule. The row-level checks run over **every** table
in the file that carries all eight required columns and sits outside a fence,
so a second ledger-shaped table lower down is read as ledger rows too — there
is no parking spot below.

| TDD-ID | TC-Refs | Layer | Tier | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs | Owning module | Blocked-By | BR-Ref |
| ------ | ------- | ----- | ---- | --------- | -------- | ------ | ----- | -------- | ------- | ------------ | ------------- | ---------- | ------ |

`Blocked-By` is an **optional** column, seeded here so a downstream `blocked`
row never has to add one — and added to an already-seeded eight-column ledger by
Phase 2b's column migration, which runs whether or not this template was copied.
`/qfai-implement` may write the `Status`, `DR-ID`, `Evidence` and `Blocked-By`
cells unconditionally and never a row, and a `Status = blocked` row with no
blocker named raises `TDDLIST_BLOCKED_MISSING_REF`.

`BR-Ref` is **the one `BR-*` this row serves** — the T1 review-group key — and it is resolved here because this is the only phase where `03`, `04`, `05`
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

## Schema

The ledger schema — required columns, the optional `US-Refs` / `CON-API-Refs` /
`Blocked-By` / `Owning module` / `BR-Ref` columns, the `Status` vocabulary, and the
`Evidence` cell contract — is defined in
`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`.

Do not restate it here. A second copy has nothing keeping it honest: it drifts
silently away from the rules `validateTddList` enforces, and an author filling
this ledger reads the copy, not the rules.
