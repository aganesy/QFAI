# Change Request

- ID: `CR-20260925-0015`
- Title: `Bind a run's spec from its one affected spec, and leave maintenance and verify without a target`
- Raised by: `/qfai-implement orchestrator`
- Raised at: `2026-09-25T10:19:49Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — option 1 selected through the structured question tool
- Approved at: `2026-09-25T10:19:49Z` (recorded at; reply timestamp unavailable)
- Approved option: `1`
- Applied at: `2026-09-25T10:20:50Z`
- Superseded by: `-`

## Context

CLI-WF leaves two gaps in how a work order gets its spec.

### Gap A: no binding outside a new capability

The only rule that binds a spec is in `## Authorizations`: when the SDD result
reports `bindings`, the core appends a binding event. Only the `feature` route
has an SDD stage that reports `bindings`. The `bugfix`, `bounded-change` and
`direct` routes have no rule that binds a spec, so on the built CLI they never
issue their first spec-bound stage and `next` answers "The plan is not ready."
The same holds for a `feature` proposal that changes an existing spec and lists
no new capability. The route proposal already names the specs a change affects
in `affectedSpecIds`.

### Gap B: stages that bind no spec

`### Work order` says `target` is absent only from the `route` and `discussion`
work orders. The direct route's `maintenance` stage and every route's `verify`
stage also bind no spec: `maintenance` makes a non-normative edit, and
`verify-full` verifies the whole project.

### What spec-0018 says

No item of `spec-0018` states how a non-feature route binds its spec, or which
work orders carry a target. `TC-0018-0012` lists the proposal refusal reasons
one per boundary, so a new reason leaves it incomplete. The E2E journeys
`spec-0018/TDD-0456`, `TDD-0457` and `TDD-0461` run routes that need a spec
binding before their first spec-bound stage.

## Proposed change

- CLI-WF `### Route proposal`: when the checked proposal lists no
  `newCapabilities` and the plan has a stage that takes a spec target, accepting
  the plan binds the one spec `affectedSpecIds` names. The core appends a
  `binding-recorded` event naming that spec, with no slot. A proposal with a new
  capability binds from the SDD result, as today.
- A new refusal reason, `spec-binding`: `newCapabilities` is empty, the plan has
  a stage that takes a spec target, and `affectedSpecIds` names no spec or more
  than one.
- CLI-WF `### Work order`: `target` is absent from the `route`, `discussion`,
  `maintenance` and `verify` work orders, and never absent from any other.
- CLI-WFFILE `summary.json`: a spec bound from `affectedSpecIds` has no slot and
  adds no `targetBindings` entry.
- `TC-0018-0012` gains the `spec-binding` reason.

No new field is added.

## Options (at least 3) and recommendation

All three options were put to the user.

| #   | Option                                                          | Cost                                                          | Risk                                                          | Recommended |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | ----------- |
| 1   | Bind from exactly one `affectedSpecIds`; refuse none or several | One rule, one refusal reason, one target cell, one TC         | A change spanning two specs must be routed as two runs        | ✅          |
| 2   | Add a `primarySpecId` field to the proposal                     | A new field in the proposal, its schema and the routing skill | Two fields that can disagree about which spec the run changes |             |
| 3   | Issue one work order per affected spec, in sequence             | Per-spec stage instances, receipts and ledger checks          | A much larger state machine for a case no journey needs yet   |             |

## Blocked downstream items

| Item                                           | Kind         | Why it depends on the artifact                                       |
| ---------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| `spec-0018/TDD-0015` to `spec-0018/TDD-0022`   | `ledger-row` | `TC-Refs` names `TC-0018-0012`, whose reason set grows by one        |
| `spec-0018/TDD-0456`                           | `ledger-row` | Its E2E journey needs the spec binding before its first spec stage   |
| `spec-0018/TDD-0457`                           | `ledger-row` | Its E2E journey needs the spec binding before its first spec stage   |
| `spec-0018/TDD-0461`                           | `ledger-row` | Its E2E journey needs the spec binding before its first spec stage   |
| `.qfai/contracts/cli/qfai-workflow.md`         | `contract`   | `### Route proposal` and the `target` row of `### Work order` change |
| `.qfai/contracts/cli/workflow-files.schema.md` | `contract`   | `summary.json` says where a spec binding with no slot is held        |

- `TDD-0015` to `TDD-0022` keep their eight boundaries and obligations. The new
  reason needs one more row with boundary `spec-binding`, seeded by the ledger's
  owner.
- `TDD-0456`, `TDD-0457` and `TDD-0461` keep their obligations. They can now
  reach their spec-bound stages.
- Not blocked by this CR: the `feature` cases that bind from `bindings`
  (`TC-0018-0005`, `TC-0018-0058`), which do not change.
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0018` `TC-0018-0012`; the contract delta record in every spec
  that references CLI-WF or CLI-WFFILE, and in `_policies`
- Plans: none
- Tests: the ledger rows in `## Blocked downstream items`
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`; CLI-WFFILE —
  `.qfai/contracts/cli/workflow-files.schema.md`
- Schema: `packages/qfai/assets/schemas/workflow/work-order.schema.json` omits
  `target` only for `route` and `discussion`, and its description says so. The
  implementation lane adds `maintenance` and `verify`.
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/contracts/cli/workflow-files.schema.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`, the `09_delta.md` files of
  `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`,
  `spec-0013`, `spec-0014`, `spec-0015`, `spec-0018`, and
  `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

How a run without a new capability learns which spec its stages work on.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` and
   `/qfai-sdd --contract .qfai/contracts/cli/workflow-files.schema.md` in
   `re-derive` mode for the binding rule, the `spec-binding` reason, the
   `target` row and the `summary.json` note. Record this CR in the `09_delta.md`
   of every spec that references either contract and in `_policies/10_delta.md`.
2. `/qfai-sdd spec-0018` in `re-derive` mode for `TC-0018-0012`. No ID is
   removed or renumbered.
3. Implementation lane, after this CR:
   - the core binds the spec at plan acceptance and refuses `spec-binding`;
   - `maintenance` and `verify` work orders carry no `target`;
   - `work-order.schema.json` omits `target` for those two kinds as well;
   - a `binding-recorded` event with no slot adds no `targetBindings` entry.
4. Downstream ledger sweep:
   - Reset: none. Every row named above keeps its obligation.
   - Seed: one `TC-0018-0012` row with boundary `spec-binding`, at `todo`, by the
     ledger's owner.
   - Retire: none.

## Resolution

The owner reruns ran in `re-derive` mode and changed no ID.

- CLI-WF `### Route proposal` states the two ways a run binds its spec, and
  that every stage but `route`, `discussion`, `maintenance` and `verify` takes
  the bound spec as its `target`. Its refusal table gains `spec-binding`.
- The `target` row of CLI-WF `### Work order` names the four work orders without
  a target.
- CLI-WFFILE `summary.json` gains a **Spec binding** note: a binding from
  `affectedSpecIds` adds no `targetBindings` entry.
- `TC-0018-0012` plants `spec-binding` with a `bugfix` plan whose proposal
  `affectedSpecIds` names two specs, and now counts nine reasons.
- No other BR, AC or EX of `spec-0018` stated or contradicted either point.

Nothing under `packages/**` was edited; step 3 is the implementation lane's.
Ledger sweep: no row was reset or retired. Seeding the `spec-binding` row of
`TC-0018-0012` is handed to the agent that holds the ledgers in this worktree.
