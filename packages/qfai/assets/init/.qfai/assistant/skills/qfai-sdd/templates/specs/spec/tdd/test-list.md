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

**Retiring a row means deleting it from the table.** There is no `retired`
status: the legal values are the eight the `Status` row of the schema table
below lists, and any other one is a `TDDLIST_INVALID_STATUS` **error** — so
writing `Status = retired`
fails the run that followed the instruction. Nor is there a parking spot lower
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

Copy the deleted row's `Evidence` cell into that record verbatim — **and, when
that cell holds an anchor, the body of the `### TDD-NNNN` section it points at
along with it**. `Evidence` is
only a pointer into the evidence file this row's `Layer` owns —
`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md`
for an `Integration`, `API` or `E2E` row — and the QFAI-managed `.gitignore`
block excludes `.qfai/evidence/*` while re-including only `decisions/`,
`change-request-*.md`, `decision-*.md` and `coverage-depth-*.md`.
In the default layout neither evidence file is tracked, so the pointer alone
leaves a clean checkout, CI or a second operator holding a reference nothing can
resolve: the RED/GREEN commands and their output, and the reviewer verdicts,
have to come across as well or the cycle's audit record dies with the row. A
project that does track those evidence files may cite the section instead of
transcribing it, since the pointer still resolves there.

**A row retired before it ever ran has no such section.** `todo`, `blocked`,
`red` and `exception` owe no evidence — only `green`, `refactor`, `review-fix`
and `done` are asked for a command and its result — so the cell is empty or a
bare dash and the `### TDD-NNNN` it would anchor to does not exist. Write that
down as what it is, `no evidence — retired at Status = <status>, never
executed`, and delete the row on it. Transcribe a body only when the cell names
one: never compose a section so the rule has something to copy, and never hold
a retirement open waiting on evidence a `todo` row was never going to produce.

**The body never goes into `_policies/10_delta.md`.** When the approving Triage
row is the cross-spec one persisted there, that file is still barred from
carrying spec-local `US` / `AC` / `BR` / `EX` / `TC` IDs, and the
layered-traceability scan exempts only the cells of the canonical `## Triage`
table — anything written beneath or beside that table stays visible to it and
raises `QFAI-LAYER-100` / `TRACE_SHARED_SCOPE_VIOLATION` at `error`. An
evidence body always trips it, because the `### TDD-NNNN` contract requires the
row's own `TC-ref` / `US-ref` / `CON-API-ref`; and it would not survive a table
cell in any case, since a GFM cell is one physical line and ends at every
unescaped `|`. Put the body in the retiring spec's own `09_delta.md` — tracked
under `.qfai/specs/`, and under no such ban — and have the Triage row cite it
as `<spec-id>/09_delta.md` in its `Rationale` cell, which the scan does exempt.

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
reads it with `parseFirstMarkdownTable`. Keep it first; a table above it is
parsed as the ledger instead and raises eight
`TDDLIST_REQUIRED_COLUMN_MISSING` errors.

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |

## Schema

Required columns, in the order used above:

| Column    | Description                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------- |
| TDD-ID    | `TDD-NNNN`, unique within this spec and never reused after retirement                           |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements                                          |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`                                              |
| Test file | Project-root-relative path to the test module                                                   |
| Selector  | Test selector/description for targeted execution                                                |
| Status    | `todo` / `blocked` / `red` / `green` / `refactor` / `review-fix` / `done` / `exception` — all 8 |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)                                           |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle                                            |

A `blocked` row also needs a `Blocked-By` column naming what it waits on;
without one the row raises `TDDLIST_BLOCKED_MISSING_REF`.

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
