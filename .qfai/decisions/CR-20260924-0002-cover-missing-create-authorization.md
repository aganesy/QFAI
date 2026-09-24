# Change Request

- ID: `CR-20260924-0002`
- Title: `Cover a missing CREATE authorization before the SDD work order`
- Raised by: `qfai-implement`
- Raised at: `2026-09-24T14:38:18Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — selected Option 1 in this session
- Approved at: `2026-09-24T18:17:53Z` (approval recorded; exact reply time unavailable)
- Approved option: `1`
- Applied at: `2026-09-24T18:26:35Z`
- Superseded by: `-`

## Context

`AC-0018-0002`, `BR-0018-0002` and CLI-WF require an SDD work order for a new capability to carry its human CREATE authorization. `TC-0018-0003` tests the positive path. No test case addresses a `ready` feature snapshot whose apparent approval lacks a persisted `authorizationId`. The current `next` implementation accepts that snapshot and issues an SDD work order with `authorizationRefs: []`. Both independent TDD-0003 reviewers rejected that path.

The missing-ID refusal is independently observable from the positive decision and dispatch path. The execution ledger requires one boundary per row, so adding another assertion to the completed positive selector would not supply a separate RED observation.

## Proposed change

Cover `next` on a `ready` feature snapshot with a CREATE approval that has the correct slot and effect but lacks a persisted authorization ID. The run moves to `awaiting_input` with a new `create` question for that slot; no SDD work order or `work-order-issued` event is emitted. This follows discussion REQ-0042 and AC-0018-0002. Keep the positive `TC-0018-0003` obligation and its TDD row. Whichever option is selected, give the negative boundary its own T2 Unit ledger row owned by `decide.ts`. Add the missing `ready` → `awaiting_input` issue-time transition to CLI-WF's state machine and describe the missing-ID case in its authorization rules. The new question is issued by the workflow core; SDD Stage 1 still asks nothing.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                 | Cost                                                    | Risk                                                                                             | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| 1   | Add standalone negative `TC-0018-0268`, `EX-0018-0154` and `TDD-0527`.                                                                                                 | One new focused case, example and T2 Unit ledger seed.  | Smallest change; preserves one boundary per row.                                                 | ✅          |
| 2   | Expand `TC-0018-0003` and `EX-0018-0002` into positive and negative boundaries; retain `TDD-0003` for the positive path and seed `TDD-0527` for the negative selector. | Rework an already reviewed positive TC and its example. | The TC becomes a matrix with two outcomes; owner sweep must assess `TDD-0003`.                   |             |
| 3   | Expand `TC-0018-0006` and `EX-0018-0005` with the missing-ID boundary; retain its six staleness rows and seed `TDD-0527` for the missing-ID selector.                  | Rework an existing staleness matrix and example.        | Conflates an absent record with a stale recorded approval; owner sweep must assess its six rows. |             |

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                |
| -------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| `spec-0018/TDD-0002` | `ledger-row` | Its completed feature-plan fixture supplies an approval with no ID and currently reaches SDD. |
| `spec-0018/TDD-0003` | `ledger-row` | Both Round 1 reviewers require the missing-ID path to be closed before this row completes.    |
| `spec-0018/TDD-0005` | `ledger-row` | Its SDD work order depends on the authorization boundary.                                     |
| `spec-0018/TDD-0006` | `ledger-row` | Its issue-time scope check depends on the SDD authorization.                                  |
| `spec-0018/TDD-0007` | `ledger-row` | Its accept-time scope check depends on the SDD authorization.                                 |
| `spec-0018/TDD-0008` | `ledger-row` | Its issue-time capability check depends on the SDD authorization.                             |
| `spec-0018/TDD-0009` | `ledger-row` | Its accept-time capability check depends on the SDD authorization.                            |
| `spec-0018/TDD-0010` | `ledger-row` | Its issue-time replan check depends on the SDD authorization.                                 |
| `spec-0018/TDD-0011` | `ledger-row` | Its accept-time replan check depends on the SDD authorization.                                |
| `spec-0018/TDD-0012` | `ledger-row` | Its SDD result binding depends on the SDD authorization.                                      |
| `spec-0018/TDD-0065` | `ledger-row` | Its accepted SDD result replay depends on the authorized SDD order.                           |
| `spec-0018/TDD-0076` | `ledger-row` | Its created-spec binding depends on the authorized SDD order.                                 |
| `spec-0018/TDD-0077` | `ledger-row` | Its unbound-capability refusal depends on the authorized SDD order.                           |
| `spec-0018/TDD-0455` | `ledger-row` | The feature journey exercises CREATE authorization and SDD dispatch.                          |

- The 526 ledger rows were screened by their TC, selector and journey. The listed rows are the complete affected set for this missing-ID CREATE authorization path. `TDD-0001` observes the routing question before authorization; `TDD-0004` observes the two-capability question round. `TDD-0454` uses a minimal-project CLI fixture and does not exercise CREATE.
- Overlapping open CRs: `CR-20260925-0004` also blocks `TDD-0455`.
  `CR-20260925-0003` touches the spec-0018 ledger but blocks `TDD-0014`,
  outside this CR's blocked set. `CR-20260924-0001` is approved and applied.

## Impact scope

- Specs: `spec-0018` test case and ledger; contract references in `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`, `spec-0013`, `spec-0014`, `spec-0015`, `spec-0018` and `_policies`
- Plans: none
- Tests: every option adds a T2 Unit ledger row for the negative selector; Option 1 adds `TC-0018-0268` and `EX-0018-0154`, Option 2 expands `TC-0018-0003` and `EX-0018-0002`, Option 3 expands `TC-0018-0006` and `EX-0018-0005`; `TDD-0002` fixture re-verification and `TDD-0003` review fix remain required
- Contracts: `.qfai/contracts/cli/qfai-workflow.md` (authorization rule and `ready` → `awaiting_input` edge)
- Schema: none
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/specs/spec-0018/05_Examples.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`,
  `.qfai/specs/spec-0018/tdd/test-list.md`,
  `.qfai/specs/spec-0001/09_delta.md`, `.qfai/specs/spec-0003/09_delta.md`,
  `.qfai/specs/spec-0008/09_delta.md`, `.qfai/specs/spec-0010/09_delta.md`,
  `.qfai/specs/spec-0011/09_delta.md`, `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0013/09_delta.md`, `.qfai/specs/spec-0014/09_delta.md`,
  `.qfai/specs/spec-0015/09_delta.md`, `.qfai/specs/spec-0018/09_delta.md`,
  `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

Choose where to record the missing-ID refusal. Every option has a separate TDD selector and the same `awaiting_input` behavior. Option 1 is recommended because it gives the negative path its own test case without changing an already reviewed positive obligation.

## Approved actions (owner skill rerun plan)

1. On approval, run `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive` mode for the authorization rule and state edge. Record this CR in `09_delta.md` for `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`, `spec-0013`, `spec-0014`, `spec-0015` and `spec-0018`, and in `_policies/10_delta.md` for the cross-spec contract change.
2. Run `/qfai-sdd spec-0018` in `re-derive` mode for the selected test-case option and ledger seed. Option 1 adds `TC-0018-0268` and `EX-0018-0154`; Option 2 expands `TC-0018-0003` and `EX-0018-0002`; Option 3 expands `TC-0018-0006` and `EX-0018-0005`. Each seeds a separate T2 Unit row for the missing-ID selector while retaining the positive obligation. The negative boundary requires `awaiting_input` and a new `create` question, with no SDD work order or issued event.
3. Sweep downstream ledger obligations in every referencing spec. Reset an existing row only if the owner rerun actually changes its TC, US or contract obligation; Option 2 requires reassessing `TDD-0003`, and Option 3 requires reassessing `TDD-0006`–`TDD-0011`. Keep `TDD-0002` done while its obligation remains unchanged; complete its shared-test re-verification and reviews before treating it as current. Keep `TDD-0003` at `review-fix` only if the selected option leaves its obligation unchanged.
4. Resume the blocked set after both owner reruns. Write the new negative test RED before requiring the ID in `next`; update the TDD-0002 fixture with a valid ID. Since this changes a shared test artifact, re-verify the completed TDD-0001 and TDD-0002 selectors, their original falsifying mutations, restored GREEN, hashes and manifests, and obtain the required fresh reviewer verdicts while preserving their `done` statuses. Re-review TDD-0003 against the corrected authorization boundary.

## Resolution

The user selected Option 1. The exact reply timestamp was unavailable; the
`Approved at` field records when that choice was entered in this CR.
`/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` re-derived the
authorization rule and added the `ready` to `awaiting_input` edge. The
`/qfai-sdd spec-0018` rerun added `EX-0018-0154`, `TC-0018-0268` and the T2
Unit row `spec-0018/TDD-0527`, and recorded this CR in the ten referencing
spec deltas and `_policies/10_delta.md`.

The owner sweep found no changed or removed existing TC, US or contract
obligation, so it reset or retired no row. `spec-0018/TDD-0005` to
`TDD-0012`, `TDD-0065`, `TDD-0076` and `TDD-0077` moved from `blocked` to
`todo`. `TDD-0455` remains `blocked` with `CR-20260925-0004` as its active
blocker. `TDD-0002` remains `done`, and `TDD-0003` remains `review-fix`.
The new negative RED, the TDD-0002 fixture correction and completed-row
re-verification are downstream implementation work under this approved
contract, not evidence claimed by this SDD rerun.
