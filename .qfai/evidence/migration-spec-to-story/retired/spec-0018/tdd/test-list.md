# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

`/qfai-sdd` seeds the rows at Phase 2b, in **five groups**:

- **one row per coverage-target TC** from `06_Test-Cases.md` — `Layer` from the
  TC's declared `Level`, obligation in `TC-Refs`;
- **one `Layer = Integration` row per integration-level TC** from the same file
  — every `Level` whose ATDD annotation routes to `tests/integration/**`: `L3`,
  `integration`, a blank cell, a spelling that names no layer,
  and `system` / `acceptance`; obligation in `TC-Refs`;
- **one `Layer = E2E` row per active `US-*`** from `02_User-stories.md` —
  obligation in `US-Refs`, `TC-Refs` is `-`;
- **one `Layer = API` row per active `CON-API-*`** the spec **owns** —
  obligation in `CON-API-Refs`, `TC-Refs` is `-`;
- **one `Layer = Integration` row per active `CON-DB-*`** the spec **owns** —
  obligation in `CON-DB-Refs`, `TC-Refs` is `-`. A contract declares failures
  whether or not a user story names it, and the constitution routes `CON-DB-*`
  to Integration, so a contract-only flow has a row of its own.

Without the E2E / API groups the ledger has nowhere to hold a `US-*` /
`CON-API-*` obligation, so an all-`done` ledger can sit beside a
`QFAI-ATDD-111` / `QFAI-ATDD-113` gate at 0% and still report itself complete.
Without the integration group an integration-level TC has no row at all, and
nothing reports its absence — the whole integration layer then sits outside the
micro-cycle while `validate` stays quiet.

**A UI contract has no group and no column.** A `CON-UI-*` reaches this ledger
only through test cases: each screen obligation the contract declares is a
`TC-*` in `06_Test-Cases.md` of the spec that owns the screen, and that TC's row
carries it. A spec binds the contract with a business rule's `Contract-Refs`
cell or a `QFAI-CONTRACT-REF:` line, and `QFAI-CONTRACT-043` (warning) reports a
UI contract no live spec binds. Nothing checks that every screen obligation of a
bound contract has its own test case, so write it when the contract is written.

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
obligation the spec dropped belongs to the change record.

**`Boundary` is that key, paired with `TC-Refs`.** The sibling rows of a split
`TC-*` repeat that `TC-*` identically and carry serial `TDD-ID`s, so neither
says which row covers which boundary. `Boundary` does: a short slug for the one
observable boundary the row owns, seeded here while `Test file` is still `-` and
never rewritten downstream. Re-deriving the boundary set answers how many
boundaries the TC has now; it does not answer which row is which, and pairing a
row with the wrong one moves that row's `Status`, `Evidence` and `TDD-ID` onto
behaviour they never described — silently, since the row count stays right and
every row still cites a real TC. Match on the (`TC-Refs`, `Boundary`) pair. The
pair and not the slug alone: a slug is unique inside its own `TC-*` and nowhere
wider, so a generic one (`not-found`) recurs across TCs.

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

| TDD-ID   | TC-Refs      | Layer       | Tier | Test file | Selector | Status | DR-ID | Evidence | US-Refs      | CON-API-Refs | Owning module                                                                                              | Blocked-By | BR-Ref       | Boundary                      |
| -------- | ------------ | ----------- | ---- | --------- | -------- | ------ | ----- | -------- | ------------ | ------------ | ---------------------------------------------------------------------------------------------------------- | ---------- | ------------ | ----------------------------- |
| TDD-0001 | TC-0018-0001 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0001 | -                             |
| TDD-0002 | TC-0018-0002 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0001 | -                             |
| TDD-0003 | TC-0018-0003 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0002 | -                             |
| TDD-0004 | TC-0018-0004 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/scripts/_step.mjs             | -          | BR-0018-0003 | -                             |
| TDD-0005 | TC-0018-0005 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0004 | -                             |
| TDD-0006 | TC-0018-0006 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/idMap.ts                                                           | -          | BR-0018-0004 | -                             |
| TDD-0007 | TC-0018-0007 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0005 | -                             |
| TDD-0008 | TC-0018-0008 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0005 | -                             |
| TDD-0009 | TC-0018-0009 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0005 | -                             |
| TDD-0010 | TC-0018-0010 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0006 | -                             |
| TDD-0011 | TC-0018-0011 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0007 | -                             |
| TDD-0012 | TC-0018-0012 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0008 | -                             |
| TDD-0013 | TC-0018-0013 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step01RenameDirectories.ts                                         | -          | BR-0018-0009 | -                             |
| TDD-0014 | TC-0018-0014 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0010 | -                             |
| TDD-0015 | TC-0018-0015 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0011 | -                             |
| TDD-0016 | TC-0018-0016 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step05CasesToExamples.ts                                           | -          | BR-0018-0012 | -                             |
| TDD-0017 | TC-0018-0017 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step05CasesToExamples.ts                                           | -          | BR-0018-0012 | -                             |
| TDD-0018 | TC-0018-0018 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0013 | -                             |
| TDD-0019 | TC-0018-0019 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0014 | -                             |
| TDD-0020 | TC-0018-0020 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0015 | -                             |
| TDD-0021 | TC-0018-0021 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0015 | -                             |
| TDD-0022 | TC-0018-0022 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0016 | -                             |
| TDD-0023 | TC-0018-0023 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step01RenameDirectories.ts                                         | -          | BR-0018-0017 | -                             |
| TDD-0024 | TC-0018-0024 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step01RenameDirectories.ts                                         | -          | BR-0018-0018 | -                             |
| TDD-0025 | TC-0018-0025 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step01RenameDirectories.ts                                         | -          | BR-0018-0018 | -                             |
| TDD-0026 | TC-0018-0026 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step01RenameDirectories.ts                                         | -          | BR-0018-0019 | -                             |
| TDD-0027 | TC-0018-0027 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step01RenameDirectories.ts                                         | -          | BR-0018-0020 | -                             |
| TDD-0028 | TC-0018-0028 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0021 | -                             |
| TDD-0029 | TC-0018-0029 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0022 | -                             |
| TDD-0030 | TC-0018-0030 | Unit        | T1   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0023 | -                             |
| TDD-0031 | TC-0018-0031 | Unit        | T1   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0023 | -                             |
| TDD-0032 | TC-0018-0032 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0024 | -                             |
| TDD-0033 | TC-0018-0033 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0025 | -                             |
| TDD-0034 | TC-0018-0034 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0026 | -                             |
| TDD-0035 | TC-0018-0035 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0027 | -                             |
| TDD-0036 | TC-0018-0036 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0028 | -                             |
| TDD-0037 | TC-0018-0037 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0028 | -                             |
| TDD-0038 | TC-0018-0038 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0029 | -                             |
| TDD-0039 | TC-0018-0039 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0030 | -                             |
| TDD-0040 | TC-0018-0040 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0031 | -                             |
| TDD-0041 | TC-0018-0041 | Unit        | T1   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0032 | -                             |
| TDD-0042 | TC-0018-0042 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0033 | -                             |
| TDD-0043 | TC-0018-0043 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0034 | -                             |
| TDD-0044 | TC-0018-0044 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0035 | -                             |
| TDD-0045 | TC-0018-0045 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0035 | -                             |
| TDD-0046 | TC-0018-0046 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0036 | -                             |
| TDD-0047 | TC-0018-0047 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step05CasesToExamples.ts                                           | -          | BR-0018-0037 | -                             |
| TDD-0048 | TC-0018-0048 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step05CasesToExamples.ts                                           | -          | BR-0018-0038 | -                             |
| TDD-0049 | TC-0018-0049 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step05CasesToExamples.ts                                           | -          | BR-0018-0039 | -                             |
| TDD-0050 | TC-0018-0050 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step05CasesToExamples.ts                                           | -          | BR-0018-0039 | -                             |
| TDD-0051 | TC-0018-0051 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step05CasesToExamples.ts                                           | -          | BR-0018-0040 | -                             |
| TDD-0052 | TC-0018-0052 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step06DeriveAcRefs.ts                                              | -          | BR-0018-0041 | -                             |
| TDD-0053 | TC-0018-0053 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step06DeriveAcRefs.ts                                              | -          | BR-0018-0042 | -                             |
| TDD-0054 | TC-0018-0054 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step06DeriveAcRefs.ts                                              | -          | BR-0018-0042 | -                             |
| TDD-0055 | TC-0018-0055 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0043 | -                             |
| TDD-0056 | TC-0018-0056 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0044 | -                             |
| TDD-0057 | TC-0018-0057 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0045 | -                             |
| TDD-0058 | TC-0018-0058 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0046 | -                             |
| TDD-0059 | TC-0018-0059 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0047 | -                             |
| TDD-0060 | TC-0018-0060 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0047 | -                             |
| TDD-0061 | TC-0018-0061 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0047 | -                             |
| TDD-0062 | TC-0018-0062 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0048 | -                             |
| TDD-0063 | TC-0018-0063 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step08RewriteAnnotations.ts                                        | -          | BR-0018-0049 | -                             |
| TDD-0064 | TC-0018-0064 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step08RewriteAnnotations.ts                                        | -          | BR-0018-0050 | -                             |
| TDD-0065 | TC-0018-0065 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step08RewriteAnnotations.ts                                        | -          | BR-0018-0051 | -                             |
| TDD-0066 | TC-0018-0066 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step08RewriteAnnotations.ts                                        | -          | BR-0018-0052 | -                             |
| TDD-0067 | TC-0018-0067 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step09RepointLinks.ts                                              | -          | BR-0018-0053 | -                             |
| TDD-0068 | TC-0018-0068 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step10UpdateGitignore.ts                                           | -          | BR-0018-0054 | -                             |
| TDD-0069 | TC-0018-0069 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/SKILL.md                      | -          | BR-0018-0055 | -                             |
| TDD-0070 | TC-0018-0070 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0056 | -                             |
| TDD-0071 | TC-0018-0071 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/index.ts                                                           | -          | BR-0018-0057 | -                             |
| TDD-0072 | TC-0018-0072 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/references/migration-guide.md | -          | BR-0018-0058 | -                             |
| TDD-0073 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0001 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0074 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0002 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0075 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0003 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0076 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0004 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0077 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0005 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0078 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0006 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0079 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0007 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0080 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0008 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0081 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0009 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0082 | -            | E2E         | T2   | -         | -        | todo   | -     | -        | US-0018-0010 | -            | -                                                                                                          | -          | -            | -                             |
| TDD-0083 | TC-0018-0073 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/harness.ts                                                         | -          | BR-0018-0010 | -                             |
| TDD-0084 | TC-0018-0074 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step02MergeTables.ts                                               | -          | BR-0018-0023 | -                             |
| TDD-0085 | TC-0018-0075 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0042 | -                             |
| TDD-0086 | TC-0018-0076 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step07RulesToContracts.ts                                          | -          | BR-0018-0047 | -                             |
| TDD-0087 | TC-0018-0077 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0034 | -                             |
| TDD-0088 | TC-0018-0078 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0015 | -                             |
| TDD-0089 | TC-0018-0079 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0035 | mapped item moved             |
| TDD-0090 | TC-0018-0079 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0035 | unmapped item placed          |
| TDD-0091 | TC-0018-0080 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0059 | overlay moved beside its rule |
| TDD-0092 | TC-0018-0080 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step03MoveCatalog.ts                                               | -          | BR-0018-0059 | overlay archived and listed   |
| TDD-0093 | TC-0018-0081 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0060 | work-log entries re-keyed     |
| TDD-0094 | TC-0018-0082 | Integration | T2   | -         | -        | todo   | -     | -        | -            | -            | packages/qfai/src/migration/specToStory/step04RenumberIds.ts                                               | -          | BR-0018-0060 | work-log re-key repeated      |

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

`Boundary` is an **optional** column naming the one observable boundary a row
owns, and it is what identifies a row among the siblings of a split `TC-*`.
`/qfai-sdd` Phase 2b writes it and nothing else does, so a review-fix handback
that replaces the test and rewrites `Selector` leaves it standing. Write `-`,
or leave the cell empty, on a `TC-*` that holds one row. Once a `TC-*` holds
more than one, `npx qfai validate` reports siblings that name no boundary and
two siblings claiming the same one.

## Schema

The ledger schema — required columns, the optional `US-Refs` / `CON-API-Refs` /
`Blocked-By` / `Owning module` / `BR-Ref` columns, the `Status` vocabulary, and the
`Evidence` cell contract — is defined in
`.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`.

Do not restate it here. A second copy has nothing keeping it honest: it drifts
silently away from the rules `validateTddList` enforces, and an author filling
this ledger reads the copy, not the rules.
