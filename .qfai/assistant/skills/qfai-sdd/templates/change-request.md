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
- Class: `intent` <!-- intent | defect; see constitution/drift-protocol.md#drift-classes -->
- Status: `open` <!-- open | approved | rejected | superseded -->
- Approved by: `-` <!-- required whenever Status leaves `open` (approved / rejected / superseded) -->
- Approved at: `-` <!-- YYYY-MM-DDThh:mm:ssZ -->
- Approved option: `-` <!-- the option number below that was chosen; stays `-` when Class is defect -->
- Applied at: `-` <!-- YYYY-MM-DDThh:mm:ssZ; set only after the owner-skill rerun below completed and upstream artifacts are updated -->
- Superseded by: `-` <!-- CR-ID, required when Status is superseded -->

<!--
`Status: approved` records the operator's decision; `Applied at` records that
the approved actions were carried out. `qfai-implement` treats an approved CR
as unresolved until `Applied at` and `Resolution` are both filled, because
`constitution/drift-protocol.md` resumes downstream work only after the
upstream artifacts have been updated.
-->

## Context

<!--
Class `intent`: the upstream SSOT statement and the downstream fact that
contradicts it. Cite both by path and ID.
Class `defect`: what the artifact declares, and how it breaks that declaration
on its own terms. A defect conflicts with nothing external — say what it
contradicts in itself.
-->

## Reproduction

<!--
REQUIRED when Class is `defect`; delete this section when Class is `intent`.
The command and its verbatim output, or the two artifact excerpts that
contradict each other, with paths and line numbers. A defect claim without a
reproduction is an intent-drift CR that skipped its options
(`constitution/drift-protocol.md#drift-classes`).
-->

## Proposed change

<!--
What must change in the upstream artifact. When Class is `defect` this is the
single correct fix, and it is what the operator approves.
-->

## Options (at least 3) and recommendation

<!--
Class `intent` only — delete this section when Class is `defect`. A change with
exactly one correct answer has no option set; manufacturing a second and third
so the table is full asks the operator to ratify a comparison its author knew
was fabricated.
-->

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
2. Downstream ledger sweep: reset these `tdd/test-list.md` rows, recording this
   CR's ID in their `DR-ID` column. **Enumerate them here, before approval** —
   list the `TDD-ID`s (or a verifiable selection rule such as "every row whose
   `TC-Refs` names TC-0007"), because what the operator approves is this list.
   A reset of any row not covered by it is not operator-approved, and
   `Resolution` must match this list.
   - `<TDD-NNNN>`, `<TDD-NNNN>`, …
     This is the only sanctioned backward status transition — see
     `.qfai/assistant/skills/qfai-implement/SKILL.md`, "Approved Change Request
     reset".

## Resolution

<!--
Filled in when Status leaves `open`. Record what was actually done: the owner
skill that was rerun and the upstream artifacts it updated, and the ledger rows
reset (by TDD-ID). Set `Applied at` in the header once this section is true.
-->
