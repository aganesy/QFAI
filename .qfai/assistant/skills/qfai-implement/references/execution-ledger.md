# Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what
`/qfai-implement` has done and may still do. This file holds its schema and its status rules.

## Required columns

| Column    | Description                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-ID    | Unique identifier for the TDD item (e.g., TDD-0001)                                                                                                                       |
| TC-Refs   | References to test cases from `06_Test-Cases.md`                                                                                                                          |
| Layer     | Test layer (Unit, Integration, etc.)                                                                                                                                      |
| Test file | Path to the test file                                                                                                                                                     |
| Selector  | Test selector/description for targeted execution                                                                                                                          |
| Status    | Current lifecycle status                                                                                                                                                  |
| DR-ID     | Decision Record / Change Request ID: required for `exception` rows and for a row reopened by an upstream reset, retained through the row's later statuses; blank otherwise |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle                                                                                                                      |

## Status Lifecycle

Valid status values: `todo`, `red`, `green`, `refactor`, `done`, `exception`.

Allowed transitions:

- `todo` -> `red` (write a failing test)
- `red` -> `green` (make the test pass with minimal code)
- `green` -> `refactor` (improve code quality while keeping tests green)
- `refactor` -> `done` (item complete)
- Any active status -> `exception` (anomaly detected; record DR-ID in DR-ID column)
- `red` | `green` | `refactor` | `done` | `exception` -> `todo` — **upstream
  reset**, the only legal reopen, available from every status a row can hold.
  Permitted **only** when an approved upstream change (Drift Protocol step 4
  rerun) invalidated the row's obligation. The invalidating CR/DR ID MUST be
  recorded in the `DR-ID` column, and the reset MUST cite it in `Evidence`.
  That ID MUST be retained as the row moves on through `red`, `green`,
  `refactor` and `done` — clearing it on the next transition erases the only
  record of why a completed row was reopened. A row swept out of `exception`
  keeps the anomaly's DR-ID alongside the reset ID. A reset without a recorded
  approval is a backward transition and is prohibited.
- A reset row is at `todo`, so it owes no test file until it reaches `green`.
  The `Test file` existence check is unchanged for `green` / `refactor` /
  `done`: those statuses assert a test that ran.

Backward transitions are prohibited. Attempting `green` -> `red` must produce:
`"Backward transition prohibited: green -> red"`. The upstream reset above is
not a backward transition: it is an owner-approved re-entry, and the row starts
its cycle again from `todo`.

## Exception Handling

When transitioning to `exception`:

- A DR-ID (Decision Record ID) must be recorded in the DR-ID column.
- If the DR-ID column is empty, emit error: `"exception status requires DR-ID in DR-ID column"`.
