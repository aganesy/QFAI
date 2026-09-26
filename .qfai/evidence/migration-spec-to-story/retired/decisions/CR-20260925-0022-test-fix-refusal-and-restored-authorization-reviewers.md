# Change Request

- ID: `CR-20260925-0022`
- Title: `State what a test-fix meaning refusal and a restored authorization check change`
- Raised by: `/qfai-implement orchestrator`
- Raised at: `2026-09-25T02:59:15Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — two answers through the structured question tool
- Approved at: `2026-09-25T02:59:15Z` (recorded at; reply timestamp unavailable)
- Approved option: part A `1` (recommended); part B `2` (option 1 was recommended)
- Applied at: `2026-09-25T03:00:14Z`
- Superseded by: `-`

## Identifier

This record was raised as `CR-20260925-0008` and later held `CR-20260925-0010`. The main branch
gives both IDs to other records, so this one is `CR-20260925-0022`.

## Context

**A. `TC-0018-0081` (`spec-0018/TDD-0100`).** The case expects
"`invalid-input` with reason `test-fix-meaning`; the next work order goes to
`qfai-sdd`". CLI-WF says a refusal changes no state: the journal stays byte for
byte. A refused result therefore cannot issue the next work order.
`EX-0018-0049`, `AC-0018-0017` and `BR-0018-0049` make the same claim. The
CLI-WF reason row said only "The fix belongs to SDD".

The route to SDD already exists. The `test_fix` stage returns `needs_repair`
with a finding whose `resolvingOwner` is `qfai-sdd`, and the core routes each
such finding to its owner. spec-0011 (`AC-0011-0024`, `BR-0011-0021`) already
requires `qfai-implement` to do this.

**B. `TC-0018-0085` (`spec-0018/TDD-0111`).** CLI-WF `### Route proposal` says
`authorization-restored` "asks nothing and raises the review profile of the
run", and the `empty` state of `host:decision-question` says "the stronger
review profile". Neither says what the profile becomes. `TC-0018-0085`,
`BR-0018-0052`, `AC-0018-0019` and `EX-0018-0052` repeat the phrase. CLI-WF also
does not say how a work order's `requiredReviewerRoles` are derived. The
existing mechanism is the `review_profile` each skill has in
`.qfai/assistant/manifest/agent-routing.yml`, whose reviewers
`.qfai/assistant/manifest/review-profiles.yml` lists. `qfai-implement` already
has `implementation-heavy`; `qfai-atdd` has `runtime-heavy`, where
`implementation-reviewer` is only conditional.

## Proposed change

- **A.** `TC-0018-0081` expects "`invalid-input` with reason
  `test-fix-meaning`, naming `qfai-sdd` as the owner of the fix; the run is
  unchanged". Align `EX-0018-0049`, `AC-0018-0017`, `BR-0018-0049` and the
  CLI-WF reason row.
- **B.** CLI-WF states that `requiredReviewerRoles` are the `always_required`
  reviewers of the executor skill's review profile. In a run whose routing
  result carries `authorization-restored`, a `qfai-implement` or `qfai-atdd`
  work order takes `implementation-heavy` instead: `completion-reviewer`,
  `qa-gatekeeper` and `implementation-reviewer`. Every other work order keeps
  its skill's profile. Replace "the stronger review profile" in
  `TC-0018-0085`, `BR-0018-0052`, `AC-0018-0019`, `EX-0018-0052` and the CLI-WF
  `empty` state with that wording.

## Options (at least 3) and recommendation

Each part was put to the user with options 1 and 2. Option 3 of each part is
recorded here to meet the template minimum and was not presented.

**Part A** — option 1 selected.

| #   | Option                                                                                     | Cost                                     | Risk                                                                    | Recommended |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------- | ----------- |
| 1   | Rewrite the case: refused, naming `qfai-sdd` as the owner of the fix; the run is unchanged | One case, one example, one AC, one BR    | None found; the route to SDD is the existing `needs_repair` routing     | ✅          |
| 2   | Add a contract exception so this refusal records an event and replans to SDD               | Contract, state machine and journal rule | A refusal that changes state breaks the byte-for-byte refusal guarantee |             |
| 3   | Not presented: retire the case                                                             | A retirement and a tombstone             | The core's refusal of a changed meaning goes untested                   |             |

**Part B** — option 2 selected.

| #   | Option                                                       | Cost                                  | Risk                                                                      | Recommended |
| --- | ------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------- | ----------- |
| 1   | Add `architecture-reviewer` to the run's reviewer roles      | One contract sentence and four items  | A reviewer outside every implementation profile                           | ✅          |
| 2   | Align the implementation stages to `implementation-heavy`    | One contract paragraph and four items | For `qfai-implement` it adds nothing; the raise lands on `qfai-atdd` only |             |
| 3   | Not presented: leave "the stronger review profile" undefined | None now                              | `TC-0018-0085` has no value to assert                                     |             |

## Blocked downstream items

| Item                                   | Kind         | Why it depends on the artifact                         |
| -------------------------------------- | ------------ | ------------------------------------------------------ |
| `spec-0018/TDD-0100`                   | `ledger-row` | `TC-Refs` names `TC-0018-0081`                         |
| `spec-0018/TDD-0111`                   | `ledger-row` | `TC-Refs` names `TC-0018-0085`                         |
| `.qfai/contracts/cli/qfai-workflow.md` | `contract`   | `test-fix-meaning`, `### Work order` and `empty` state |

- Not blocked by this CR: `spec-0011` `TC-0011-0025` and its row, which already
  require `needs_repair` with `qfai-sdd` as the resolving owner and do not
  change.
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0018` `AC-0018-0017`, `AC-0018-0019`, `BR-0018-0049`,
  `BR-0018-0052`, `EX-0018-0049`, `EX-0018-0052`, `TC-0018-0081`,
  `TC-0018-0085`; the contract delta record in every spec that references
  CLI-WF, and in `_policies`
- Plans: none
- Tests: `spec-0018/TDD-0100`, `spec-0018/TDD-0111`
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`
- Schema: none
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/specs/spec-0018/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0018/04_Business-Rules.md`,
  `.qfai/specs/spec-0018/05_Examples.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`, the `09_delta.md` files of
  `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`,
  `spec-0013`, `spec-0014`, `spec-0015`, `spec-0018`, and
  `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

Part A: how a refused `test_fix` result that changed its meaning reaches SDD.
Part B: which review profile `authorization-restored` raises the run to.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive`
   mode for the `test-fix-meaning` row, the reviewer-role rule under
   `### Work order`, the `### Route proposal` sentence and the `empty` state.
   Record this CR in the `09_delta.md` of every spec that references CLI-WF and
   in `_policies/10_delta.md`.
2. `/qfai-sdd spec-0018` in `re-derive` mode for the AC, BR, EX and TC text in
   `## Impact scope`. No ID is added, removed or renumbered.
3. Downstream ledger sweep:
   - Reset to `todo`, recording this CR's ID in their `DR-ID` column:
     `spec-0018/TDD-0100`, `spec-0018/TDD-0111`. Both are at `todo` already, so
     only the `DR-ID` cell changes.
   - Retire: none.

## Resolution

The owner reruns ran in `re-derive` mode and changed no ID.

- **A.** `TC-0018-0081` and `EX-0018-0049` expect `invalid-input` with reason
  `test-fix-meaning`, naming `qfai-sdd` as the owner of the fix, and the run
  unchanged. `AC-0018-0017` and `BR-0018-0049` say the same; the BR adds that
  the `test_fix` stage reaches SDD by returning `needs_repair` with the finding
  owned by `qfai-sdd`. The CLI-WF reason row names `qfai-sdd`, says the run is
  unchanged, and names the same route. The `reasons[]` entry keeps its
  `{ reason, subject }` shape: the reason code itself names the owner.
- **B.** CLI-WF `### Work order` gains the reviewer-role rule: the
  `always_required` reviewers of the executor skill's `review_profile`, and
  `implementation-heavy` for `qfai-implement` and `qfai-atdd` work orders in a
  run carrying `authorization-restored`. The `### Route proposal` sentence and
  the `empty` state point to it. `TC-0018-0085`, `EX-0018-0052`,
  `BR-0018-0052` and `AC-0018-0019` state the same.

Ledger sweep: both rows were at `todo` and never executed, so no status changed
and no row was retired. Writing this CR's ID into their `DR-ID` cells is handed
to the agent that holds the ledgers in this worktree.
