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

## Blocked downstream items

<!--
The set STOP covers for THIS Change Request
(`constitution/drift-protocol.md#when-drift-is-detected`, step 1). Enumerate it
— an item not listed here is not blocked by this CR and continues. The halt is
not repository-wide, and this section is what makes that checkable.

Also state what this CR does NOT block when it would otherwise be assumed, and
name any other open CR whose blocked set overlaps: the effective halt is the
union of the open CRs' blocked sets.
-->

| Item                       | Kind                               | Why it depends on the artifact |
| -------------------------- | ---------------------------------- | ------------------------------ |
| `<spec-NNNN / TDD-NNNN />` | `spec` / `ledger-row` / `contract` | `<TC-Refs names …>`            |

- Not blocked by this CR: `<items a reader would expect to be blocked, and why they are not>`
- Overlapping open CRs: `<CR-ID, …>` or `none`

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
2. Downstream ledger sweep: reset **or retire** these `tdd/test-list.md` rows.
   **Enumerate them here, before approval** — list them as `<spec-id>/TDD-NNNN`
   (or a verifiable selection rule such as "every row whose `TC-Refs` names
   TC-0007"), because what the operator approves is this list. A reset or a
   retirement of any row not covered by it is not operator-approved, and
   `Resolution` must match this list. Qualify every ID with its spec: `TDD-ID`
   is unique only within its spec, so a CR touching two specs cannot otherwise
   tell their two `TDD-0001`s apart — and once a retired row is deleted, this
   list is the only place its number survives.
   - Reset to `todo`, recording this CR's ID in their `DR-ID` column:
     `<spec-id>/TDD-NNNN`, `<spec-id>/TDD-NNNN`, …
     This is the only sanctioned backward status transition — see
     `.qfai/assistant/skills/qfai-implement/SKILL.md`, "Approved Change Request
     reset".
   - Retire (delete the row; its TC is gone upstream or is no longer a coverage
     target):
     `<spec-id>/TDD-NNNN` — `<that row's Evidence cell, verbatim>`, …
     Copy the `Evidence` cell in **and paste the body of the `### TDD-NNNN`
     section it anchors to below this list**: the cell is only a pointer into
     `.qfai/evidence/implement-<spec-id>.md` (`atdd-<spec-id>.md` for an
     `Integration` / `API` / `E2E` row), which the managed `.gitignore` block
     excludes, so without the body this CR records a reference a clean checkout
     cannot resolve. A row retired before it ever ran anchors nothing — `todo`,
     `blocked`, `red` and `exception` owe no `Evidence` — so write
     `no evidence — retired at Status = <status>, never executed` in place of
     the cell value and paste no body. A retired `TDD-ID` is never reused.
     Name the test's disposition here too — `<delete tests/x.test.ts "selector">`
     or `<re-point at spec-id/TDD-NNNN>` — because deleting the row leaves the
     test itself untouched and unowned.
     A retirement carried out by `/qfai-sdd` under an approved `UPDATE:REMOVE`
     Triage row belongs in that row's `09_delta.md` instead (an `UPDATE:MODIFY`
     row's, when the TC survives a `Level` change out of coverage **and that row
     records an approver for the deletion**); do not open a CR to re-approve it.
     An `UPDATE:MODIFY` row carrying no such approval authorises no deletion,
     and that retirement comes back here.
     On the cross-spec path the approving Triage row sits in
     `_policies/10_delta.md`, which may not carry spec-local `US` / `AC` / `BR` /
     `EX` / `TC` IDs outside the `## Triage` table's own cells: put the evidence
     body in the retiring spec's `09_delta.md` and cite it from that row's
     `Rationale` cell.

## Resolution

<!--
Filled in when Status leaves `open`. Record what was actually done: the owner
skill that was rerun and the upstream artifacts it updated, and the ledger rows
touched as `<spec-id>/TDD-NNNN` — resets and retirements listed separately,
each retirement carrying the `Evidence` value its deleted row held, the
transcribed `### TDD-NNNN` evidence body, and what became of that row's test.
Set `Applied at` in the header once this section is true.
-->
