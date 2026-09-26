# Change Request

- ID: `CR-20260925-0012`
- Title: `Limit the no-process claim of finish to validate`
- Raised by: `/qfai-implement orchestrator`
- Raised at: `2026-09-25T06:04:02Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — option 1 selected through the structured question tool
- Approved at: `2026-09-25T06:04:02Z` (recorded at; reply timestamp unavailable)
- Approved option: `1`
- Applied at: `2026-09-25T06:04:36Z`
- Superseded by: `-`

## Context

`TC-0018-0030` (`spec-0018/TDD-0303`) counts `child_process` spawns during
`finish` and expects "no child process was spawned". `finish` cannot meet that:

- CLI-WF `## Boundaries` lets the core read git read-only through argv with no
  shell.
- `finish` needs those reads to judge `uncommitted` and the run change boundary
  (CLI-WF `## Completion`, `## Run change boundary`).
- The CLI-WF `## Completion` bullet the case rests on says `validateProject()`
  runs "with no shell and no process spawned". It is about validate, and
  `DR-0018-0004` records the same split: git through argv, validate in process.

`EX-0018-0019`, `AC-0018-0006` and `BR-0018-0019` say validate runs in process
and do not claim that `finish` spawns nothing.

## Proposed change

- `TC-0018-0030` records each spawn and expects that no child process runs
  validate, and that each one `finish` starts is a read-only `git` read through
  argv.
- The CLI-WF `## Completion` bullet scopes "no process spawned" to validate and
  names the git reads `## Boundaries` allows, so the two sections no longer read
  as contradictory.

## Options (at least 3) and recommendation

Options 1 and 2 were put to the user. Option 3 is recorded here to meet the
template minimum and was not presented.

| #   | Option                                                                         | Cost                                        | Risk                                                               | Recommended |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------ | ----------- |
| 1   | Limit the claim to validate: no process runs validate; git reads use argv only | One case reworded and one contract sentence | None found; matches `DR-0018-0004`                                 | ✅          |
| 2   | Read git without a child process, by parsing `.git` directly                   | A git reader in the core, and its upkeep    | Reimplements index, packfile and worktree handling the core avoids |             |
| 3   | Not presented: drop the spawn assertion from the case                          | One cell                                    | A validate run through a child process would go unnoticed          |             |

## Blocked downstream items

| Item                                   | Kind         | Why it depends on the artifact                 |
| -------------------------------------- | ------------ | ---------------------------------------------- |
| `spec-0018/TDD-0303`                   | `ledger-row` | `TC-Refs` names `TC-0018-0030`                 |
| `.qfai/contracts/cli/qfai-workflow.md` | `contract`   | One sentence added to a `## Completion` bullet |

- Not blocked by this CR: `TC-0018-0163` and its row, which scan the sources
  for a shell option and are unchanged.
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0018` `TC-0018-0030`; the contract delta record in every spec
  that references CLI-WF, and in `_policies`
- Plans: none
- Tests: `spec-0018/TDD-0303`
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`
- Schema: none
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`, the `09_delta.md` files of
  `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`,
  `spec-0013`, `spec-0014`, `spec-0015`, `spec-0018`, and
  `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

Whether `finish` may start read-only git processes, or must read git without
any child process.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive`
   mode for the `## Completion` validate bullet. Record this CR in the
   `09_delta.md` of every spec that references CLI-WF and in
   `_policies/10_delta.md`.
2. `/qfai-sdd spec-0018` in `re-derive` mode for `TC-0018-0030`. No ID is
   added, removed or renumbered.
3. Downstream ledger sweep:
   - Reset to `todo`, recording this CR's ID in its `DR-ID` column:
     `spec-0018/TDD-0303`. It is at `todo` already, so only the `DR-ID` cell
     changes.
   - Retire: none.

## Resolution

The owner reruns ran in `re-derive` mode and changed no ID.

- `TC-0018-0030` records each `child_process` spawn and expects that no child
  process runs validate, and that each one `finish` starts is a read-only `git`
  argv read.
- The CLI-WF `## Completion` bullet now says validate runs with no process
  spawned for it, and that the git reads `finish` needs are the read-only argv
  reads `## Boundaries` allows.
- `EX-0018-0019`, `AC-0018-0006` and `BR-0018-0019` carried no such claim and
  are unchanged.

Ledger sweep: the row was at `todo` and never executed, so no status changed and
no row was retired. Writing this CR's ID into its `DR-ID` cell is handed to the
agent that holds the ledgers in this worktree.
