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
| Evidence  | A **pointer** to the proof, in one shape (below), max 240 ch |

The `Evidence` cell is a pointer, **not** the payload: a command and its output
pasted into a table cell either ends the row at a newline or splits it at a
pipe, both silently. The commands, their output and the reviewer verdicts live
in `.qfai/evidence/implement-<spec-id>.md` — or `atdd-<spec-id>.md` for an
`Integration` / `API` / `E2E` row — and the cell says where to read them:

```
RED:<fail|falsifiability|n-a> GREEN:pass ORACLE:<proved|equivalent-mutant> [TIER:<T1|T2|T3>] REV:<revision> -> <anchor>
```

```
RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/implement-spec-0001.md#tdd-0001`
```

`RED:n-a` is **not** available on an `Integration` / `API` / `E2E` row — those
owe an observed RED or a falsifiability argument, and using it there is
`TDDLIST_EVIDENCE_RED_PROVENANCE` (`error`), which no waiver covers. The anchor
is checked against the row, not only for shape: its stage is the one the
`Layer` assigns, its `<spec-id>` is this spec's, and its fragment is this row's
own `### TDD-NNNN` section in the evidence file. Anything else raises
`TDDLIST_EVIDENCE_CELL_MALFORMED` / `TDDLIST_EVIDENCE_CELL_OVERSIZE`. A row
with more cells than the header declares raises `TDDLIST_ROW_EXTRA_CELLS`. The
full grammar is in
`.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`.

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.
