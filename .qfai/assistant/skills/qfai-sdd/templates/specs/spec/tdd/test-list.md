# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

Rows are derived from `06_Test-Cases.md`: **one row per coverage-target TC**.
`/qfai-sdd` seeds them at Slice time; `/qfai-atdd` adds `Layer = E2E` and
`Layer = API` rows for `US-*` and `CON-API-*` obligations. An empty table below
is valid — it means the spec has no coverage-target TC yet, not that the ledger
is missing.

## Schema

Required columns, in this order:

| Column    | Description                                              |
| --------- | -------------------------------------------------------- |
| TDD-ID    | `TDD-NNNN`, unique within this spec                      |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements   |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`       |
| Test file | Project-root-relative path to the test module            |
| Selector  | Test selector/description for targeted execution         |
| Status    | `todo` / `red` / `green` / `refactor` / `done` / `exception` |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)    |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle     |

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.

## Ledger

| TDD-ID   | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| -------- | ------- | ----- | --------- | -------- | ------ | ----- | -------- |
