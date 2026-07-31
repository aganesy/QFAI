# Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what
`/qfai-implement` has done and may still do. This file holds its schema and its status rules.

## Required columns

| Column    | Description                                                                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-ID    | Unique identifier for the TDD item (e.g., TDD-0001)                                                                                                                                                                         |
| TC-Refs   | References to test cases from `06_Test-Cases.md`                                                                                                                                                                            |
| Layer     | Test layer (Unit, Integration, etc.)                                                                                                                                                                                        |
| Test file | Path to the test file                                                                                                                                                                                                       |
| Selector  | Test selector/description for targeted execution                                                                                                                                                                            |
| Status    | Current lifecycle status                                                                                                                                                                                                    |
| DR-ID     | Decision Record / Change Request IDs, comma-separated: a `DR-*` is required for `exception` rows, a `CR-*` for a row reset by an approved Change Request and is retained through that row's later statuses; blank otherwise |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle                                                                                                                                                                        |

## Status Lifecycle

Valid status values: `todo`, `red`, `green`, `refactor`, `done`, `exception`.

Allowed transitions:

- `todo` -> `red` (write a failing test)
- `red` -> `green` (make the test pass with minimal code)
- `green` -> `refactor` (improve code quality while keeping tests green)
- `refactor` -> `done` (item complete)
- Any active status -> `exception` (anomaly detected; record DR-ID in DR-ID column)

Backward transitions are prohibited. Attempting `green` -> `red` must produce:
`"Backward transition prohibited: green -> red"`.

The one exception is an approved Change Request reset — the only sanctioned
backward transition. Preconditions and the reset procedure:
`references/change-request-reset.md`.

## Exception Handling

When transitioning to `exception`:

- A DR-ID (Decision Record ID) must be recorded in the DR-ID column.
- A retained `CR-*` does not satisfy this: it records the approved reopen, not the anomaly. Add the `DR-*` alongside it (`DR-NNNN, CR-YYYYMMDD-NNNN`).
- If the DR-ID column is empty, or holds `CR-*` references only, emit error: `"exception status requires DR-ID in DR-ID column"`.
