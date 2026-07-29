# Change Request

<!--
Canonical path: `.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md`
ID pattern:     `CR-\d{8}-\d{4}`
A Change Request is the mandatory precondition for any upstream SSOT edit
(`constitution/drift-protocol.md`). `qfai-implement` blocks spec completion
while an unresolved CR exists, so `Status` must be a real, checkable field.
-->

- ID: `CR-YYYYMMDD-NNNN`
- Title: `<one-line summary>`
- Raised by: `<skill or agent>`
- Raised at: `YYYY-MM-DDThh:mm:ssZ`
- Status: `open` <!-- open | approved | rejected | superseded -->
- Approved by: `-` <!-- required when Status is approved or rejected -->
- Approved at: `-` <!-- YYYY-MM-DDThh:mm:ssZ -->
- Approved option: `-` <!-- the option number below that was chosen -->
- Superseded by: `-` <!-- CR-ID, required when Status is superseded -->

## Context (what conflicts)

<!-- The upstream SSOT statement and the downstream fact that contradicts it. Cite both by path and ID. -->

## Proposed change

<!-- What must change in the upstream artifact. -->

## Options (at least 3) and recommendation

| #   | Option     | Cost     | Risk     | Recommended |
| --- | ---------- | -------- | -------- | ----------- |
| 1   | `<option>` | `<cost>` | `<risk>` |             |
| 2   | `<option>` | `<cost>` | `<risk>` | ✅          |
| 3   | `<option>` | `<cost>` | `<risk>` |             |

## Impact scope

- Specs: `<spec-NNNN, ...>`
- Plans: `<paths>`
- Tests: `<paths / TDD-IDs>`
- Contracts: `<CON-*>`
- Schema: `<paths>`

## Decision needed from user

<!-- The exact question to put to the user. -->

## Approved actions (owner skill rerun plan)

1. `<owner skill>` rerun scope: `<what>`
2. Downstream ledger sweep: reset the `tdd/test-list.md` rows this change
   invalidates, recording this CR's ID in their `DR-ID` column.

## Resolution

<!-- Filled in when Status leaves `open`. Record what was actually done. -->
