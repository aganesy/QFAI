# Change Request

- ID: `CR-20260925-0014`
- Title: `Treat an in-scope edit of the config as policy drift at accept`
- Raised by: `/qfai-implement orchestrator`
- Raised at: `2026-09-25T08:17:21Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — option 1 selected through the structured question tool
- Approved at: `2026-09-25T08:17:21Z` (recorded at; reply timestamp unavailable)
- Approved option: `1`
- Applied at: `2026-09-25T08:17:46Z`
- Superseded by: `-`

## Context

`TC-0018-0182` (`spec-0018/TDD-0388`) has a run edit `qfai.config.yaml` inside
its write scope and then `accept`. It expects "No `policy-drift` at `accept`; the
drift counts only at `finish`".

CLI-WF `## Fail-closed` says otherwise. Its `policy-drift` row, trigger (a),
covers a change to a digest fixed at `start`, including one inside the run
change boundary's authorized set. The cause is found at write operations,
`resume` and `finish`. `## State machine` says a cause found on a run in
`running` moves it to `blocked`. The workflow core follows the contract.

`EX-0018-0097` describes a change outside the write scope, and `AC-0018-0039`
says a cause found after `start` stops automatic chaining. Neither carries the
old claim. `EX-0018-0035` and `TC-0018-0061`, which report `policy-drift` at
`finish`, stay as they are.

## Proposed change

`TC-0018-0182` expects `policy-drift` at `accept`: the run moves from `running`
to `blocked` with cause `policy-drift`, and `qfai.config.yaml` is untouched.

## Options (at least 3) and recommendation

Options 1 and 2 were put to the user. Option 3 is recorded here to meet the
template minimum and was not presented.

| #   | Option                                                                 | Cost                                      | Risk                                                            | Recommended |
| --- | ---------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- | ----------- |
| 1   | Align the case to the contract: `policy-drift` at `accept`             | One cell                                  | None found; the core already behaves this way                   | ✅          |
| 2   | Change the contract so an in-scope config edit counts only at `finish` | Contract, core and the cases that read it | A run keeps chaining stages under a gate it has already changed |             |
| 3   | Not presented: retire the case                                         | A retirement and a tombstone              | The in-scope boundary of trigger (a) goes untested              |             |

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact |
| -------------------- | ------------ | ------------------------------ |
| `spec-0018/TDD-0388` | `ledger-row` | `TC-Refs` names `TC-0018-0182` |

- Not blocked by this CR: `TC-0018-0061` and its row, which report
  `policy-drift` at `finish` and do not change.
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0018` `TC-0018-0182`
- Plans: none
- Tests: `spec-0018/TDD-0388`
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0018/06_Test-Cases.md`,
  `.qfai/specs/spec-0018/09_delta.md`

## Decision needed from user

Whether an in-scope edit of `qfai.config.yaml` stops the run at the next
`accept`, or counts only at `finish`.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0018` in `re-derive` mode for `TC-0018-0182`. No ID is added,
   removed or renumbered. Record this CR in `spec-0018/09_delta.md`.
2. Downstream ledger sweep:
   - Reset to `todo`, recording this CR's ID in its `DR-ID` column:
     `spec-0018/TDD-0388`. It is at `todo` already, so only the `DR-ID` cell
     changes.
   - Retire: none.

## Resolution

`/qfai-sdd spec-0018` ran in `re-derive` mode. `TC-0018-0182` now expects
`policy-drift` at `accept`: the run moves from `running` to `blocked` with cause
`policy-drift`, and `qfai.config.yaml` is untouched. `EX-0018-0097` and
`AC-0018-0039` carried no such claim and are unchanged. No contract changed.

Ledger sweep: the row was at `todo` and never executed, so no status changed and
no row was retired. Writing this CR's ID into its `DR-ID` cell is handed to the
agent that holds the ledgers in this worktree.
