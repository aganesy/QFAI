# Change Request

- ID: `CR-20260925-0013`
- Title: `Leave the target out of the route and discussion work orders`
- Raised by: `/qfai-implement orchestrator`
- Raised at: `2026-09-25T07:33:28Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — option 1 selected through the structured question tool
- Approved at: `2026-09-25T07:33:28Z` (recorded at; reply timestamp unavailable)
- Approved option: `1`
- Applied at: `2026-09-25T07:34:27Z`
- Superseded by: `-`

## Context

CLI-WF `### Work order` says `target` is `{ kind: "spec", specId }` or
`{ kind: "new_capability", slotId }`, and "Never absent". Two work orders have
no value that fits:

- the `route` work order, issued before any spec or capability is known;
- the `discussion` work order of the discovery route, which settles product
  scope and binds neither a spec nor a new capability.

The workflow core and the shipped work-order schema,
`packages/qfai/assets/schemas/workflow/work-order.schema.json`, already omit
`target` for those two stage kinds.

No statement in CLI-WFFILE or in `spec-0018` says every work order carries a
target. `BR-0018-0004`, `EX-0018-0004` and `TC-0018-0005` require a target on
the SDD work order only, and the `spec-0013` items on a work order without a
target concern `/qfai-sdd` only.

## Proposed change

CLI-WF `### Work order` says `target` is absent from the `route` and
`discussion` work orders, and never absent from any other work order.

## Options (at least 3) and recommendation

Options 1 and 2 were put to the user. Option 3 is recorded here to meet the
template minimum and was not presented.

| #   | Option                                                      | Cost                                                    | Risk                                                          | Recommended |
| --- | ----------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- | ----------- |
| 1   | Omit `target` from the `route` and `discussion` work orders | One contract cell; code and schema already match        | None found                                                    | ✅          |
| 2   | Add a third target kind, such as `{ kind: "project" }`      | Contract, schema, parser and every consumer of `target` | A kind that names nothing a stage acts on                     |             |
| 3   | Not presented: make `target` optional on every work order   | One contract cell                                       | An SDD work order without a target would no longer be refused |             |

## Blocked downstream items

| Item                                   | Kind       | Why it depends on the artifact               |
| -------------------------------------- | ---------- | -------------------------------------------- |
| `.qfai/contracts/cli/qfai-workflow.md` | `contract` | The `target` row of `### Work order` changes |

- Not blocked by this CR: every ledger row. No case asserts that the `route` or
  `discussion` work order carries a target, and the SDD cases keep theirs.
- Overlapping open CRs: none.

## Impact scope

- Specs: none changed; the contract delta record in every spec that references
  CLI-WF, and in `_policies`
- Plans: none
- Tests: none
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`
- Schema: none; `packages/qfai/assets/schemas/workflow/work-order.schema.json`
  already omits `target` for the two stage kinds
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  the `09_delta.md` files of `spec-0001`, `spec-0003`, `spec-0008`,
  `spec-0010`, `spec-0011`, `spec-0012`, `spec-0013`, `spec-0014`, `spec-0015`,
  `spec-0018`, and `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

What the `target` of a work order that binds no spec and no new capability is.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive`
   mode for the `target` row. Record this CR in the `09_delta.md` of every spec
   that references CLI-WF and in `_policies/10_delta.md`.
2. Downstream ledger sweep: no row is reset or retired, because no `TC-Refs`,
   `US-Refs` or `CON-API-Refs` obligation changes.

## Resolution

`/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` ran in `re-derive`
mode. The `target` row of CLI-WF `### Work order` now says `target` is absent
from the `route` and `discussion` work orders, which bind no spec and no new
capability, and never absent from any other. CLI-WFFILE and `spec-0018` held no
statement that every work order carries a target, so neither changed. The
sentence under the `recordAreas` table that an orchestrated `/qfai-sdd` work
order always carries a target stands. No ledger row was reset or retired.
