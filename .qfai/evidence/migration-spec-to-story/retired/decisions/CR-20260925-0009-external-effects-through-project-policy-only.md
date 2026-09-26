# Change Request

- ID: `CR-20260925-0009`
- Title: `Let a plan stage declare its external effects and authorize them through a project policy only`
- Raised by: `/qfai-implement orchestrator`
- Raised at: `2026-09-25T03:22:36Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — option 1 selected through the structured question tool
- Approved at: `2026-09-25T03:22:36Z` (recorded at; reply timestamp unavailable)
- Approved option: `1`
- Applied at: `2026-09-25T03:23:20Z`
- Superseded by: `-`

## Context

`TC-0018-0086` and `TC-0018-0087` (`spec-0018/TDD-0112` to `TDD-0119`) need a
plan to declare an external effect: push, pull request, merge, deploy,
production migration or extra spending. `TC-0018-0087` also needs a
`request_scope` that names a push. Neither can be built.

- A plan stage (CLI-WFFILE `### Format`) and a route proposal (CLI-WF
  `### Route proposal`) have no effects field. The plan loader refuses an
  unknown key.
- In CLI-WFFILE `## Authorization record`, only `project_policy` carries
  `effects`. A `request_scope` record holds a request digest and nothing that
  names an effect.
- CLI-WF work orders already carry `scope.allowedEffects`, with nothing saying
  where its members come from.
- CLI-WF `## Authorizations` and `BR-0018-0053` say each effect needs "a
  `project_policy` or a `request_scope` naming the effect".
- No closed set of effect names is written anywhere.

## Proposed change

- CLI-WFFILE `### Format` gains an optional `stages[].effects`: a list drawn from
  `push`, `pull-request`, `merge`, `deploy`, `production-migration` and
  `extra-spending`. The plan loader refuses any other value. The built-in plans
  declare none. The `project_policy` record's `effects` use the same set.
- CLI-WF `### Work order`: `scope.allowedEffects` holds each effect the stage
  declares that the run's `project_policy` authorization also names. An effect
  no `project_policy` names is left out. The stage runs without it, the core
  performs no external effect itself, and the completion report lists the
  effect as not requested, as CLI-WF `host:completion-report` already states.
- The `request_scope` path is removed. CLI-WF `## Authorizations` and
  `BR-0018-0053` require a `project_policy`, and say a `request_scope`
  authorizes no effect even when the request names one.
- `TC-0018-0086` names the stage declaration in its input. `TC-0018-0087` keeps
  two boundaries: a declared `deploy` a `project_policy` names is carried, and a
  declared `push` that only the request names is not. `EX-0018-0053` and
  `AC-0018-0020` follow.

## Options (at least 3) and recommendation

Options 1 and 2 were put to the user. Option 3 is recorded here to meet the
template minimum and was not presented.

| #   | Option                                                                                                  | Cost                                                                        | Risk                                                                                       | Recommended |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| 1   | Authorize through `project_policy` only; a plan stage declares its effects                              | One optional plan key, one work-order rule, one BR and three items reworded | A request that asks for a push gets none until the project adopts a policy naming it       | ✅          |
| 2   | Add `effects` to `request_scope`, filled only after the user approves them at the routing-time question | A new record field, a new question and its answer path                      | A second authorization path for effects, and a routing question on every effectful request |             |
| 3   | Not presented: drop `TC-0018-0086` and `TC-0018-0087` until effects are needed                          | Two retirements and eight tombstones                                        | The rule that the entry implies no effect goes untested                                    |             |

## Blocked downstream items

| Item                                           | Kind         | Why it depends on the artifact                                         |
| ---------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| `spec-0018/TDD-0112` to `spec-0018/TDD-0117`   | `ledger-row` | `TC-Refs` names `TC-0018-0086`                                         |
| `spec-0018/TDD-0118`, `spec-0018/TDD-0119`     | `ledger-row` | `TC-Refs` names `TC-0018-0087`                                         |
| `.qfai/contracts/cli/qfai-workflow.md`         | `contract`   | `### Work order` and `## Authorizations` change                        |
| `.qfai/contracts/cli/workflow-files.schema.md` | `contract`   | `### Format`, `### Load refusals` and `## Authorization record` change |

- `TDD-0119` keeps its `request-scope-push` boundary. Its obligation turns from
  "carried" to "not carried".
- Not blocked by this CR: every other row. No other case reads `allowedEffects`
  or a stage's effects.
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0018` `AC-0018-0020`, `BR-0018-0053`, `EX-0018-0053`,
  `TC-0018-0086`, `TC-0018-0087`; the contract delta record in every spec that
  references CLI-WF or CLI-WFFILE, and in `_policies`
- Plans: none
- Tests: `spec-0018/TDD-0112` to `spec-0018/TDD-0119`
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`; CLI-WFFILE —
  `.qfai/contracts/cli/workflow-files.schema.md`
- Schema: planned shipped schemas, not yet on disk —
  `packages/qfai/assets/schemas/workflow/work-order.schema.json`
  (`scope.allowedEffects` items from the effect set) and
  `packages/qfai/assets/schemas/workflow/authorization.schema.json`
  (`policy.effects` items from the same set). No plan schema exists or is
  planned: the plan loader under `packages/qfai/src/core/workflow/` is the only
  place that must accept `stages[].effects`. The built-in plans under
  `packages/qfai/assets/init/.qfai/assistant/process/workflows/` declare none.
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/contracts/cli/workflow-files.schema.md`,
  `.qfai/specs/spec-0018/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0018/04_Business-Rules.md`,
  `.qfai/specs/spec-0018/05_Examples.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`, the `09_delta.md` files of
  `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`,
  `spec-0013`, `spec-0014`, `spec-0015`, `spec-0018`, and
  `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

How a run learns that a stage needs an external effect, and which authorization
allows it.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd --contract .qfai/contracts/cli/workflow-files.schema.md` and
   `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive`
   mode for the effect set, `stages[].effects`, its load refusal, the
   `allowedEffects` rule and the `project_policy`-only authorization. Record
   this CR in the `09_delta.md` of every spec that references either contract
   and in `_policies/10_delta.md`.
2. `/qfai-sdd spec-0018` in `re-derive` mode for the AC, BR, EX and TC text in
   `## Impact scope`. No ID is added, removed or renumbered.
3. Implementation lane, after this CR: the plan loader accepts
   `stages[].effects` and refuses a value outside the set; the planned
   `work-order.schema.json` and `authorization.schema.json` constrain their
   effect lists to the set; the core fills `scope.allowedEffects` as CLI-WF
   `### Work order` states.
4. Downstream ledger sweep:
   - Reset to `todo`, recording this CR's ID in their `DR-ID` column:
     `spec-0018/TDD-0112` to `spec-0018/TDD-0119`. All eight are at `todo`
     already, so only the `DR-ID` cell changes.
   - Retire: none.

## Resolution

The owner reruns ran in `re-derive` mode and changed no ID.

- CLI-WFFILE `### Format` has `stages[].effects`, optional, from the six-member
  effect set, and states that the built-in plans declare none. `### Load
refusals` refuses a non-list or an effect outside the set. The
  `project_policy` record's `effects` cite the same set.
- CLI-WF `### Work order` states how `scope.allowedEffects` is filled and what
  happens to an effect no `project_policy` names. `## Authorizations` requires a
  `project_policy` and says a `request_scope` authorizes no effect.
- `BR-0018-0053` drops the `request_scope` path. `AC-0018-0020` says a request
  naming the effect changes nothing. `EX-0018-0053`, `TC-0018-0086` and
  `TC-0018-0087` state the stage declaration, and `TC-0018-0087`'s second
  boundary expects no `push` in `allowedEffects`.

Nothing under `packages/**` was edited; step 3 is the implementation lane's.
Ledger sweep: all eight rows were at `todo` and never executed, so no status
changed and no row was retired. Writing this CR's ID into their `DR-ID` cells is
handed to the agent that holds the ledgers in this worktree.
