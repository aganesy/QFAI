# Change Request

- ID: `CR-20260925-2394`
- Title: `Route a change that adds no capability to bounded-change, not feature`
- Raised by: `qfai-implement orchestrator`
- Raised at: `2026-09-25T21:57:43Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`CR-20260925-0023` binds a run's spec from its one `affectedSpecIds` entry when
the checked proposal lists no `newCapabilities`. Its context names a `feature`
proposal that changes an existing spec and lists no new capability as one of the
runs that binding serves.

That run cannot reach its first stage:

- `accept` refuses a routing result whose route is `feature` and whose
  `newCapabilities` is empty, as `invalid-input`, before any proposal check.
- The `feature` plan starts with an `sdd` stage whose operation is
  `new-capability`. With no capability, that stage has nothing to create and no
  `new_capability` slot to target.
- The core holds a `feature` plan invalid, and a `feature` run unfinished,
  without a CREATE approval for a new-capability slot.

CLI-WF does not say which route such a change takes. The routing-eval corpus
already answers it one way: every `feature` case has a new capability, and a
change to an existing capability is `bounded-change`.

## Proposed change

- CLI-WF `### Route proposal`: `feature` is the route for a change that needs a
  new capability, and its proposal lists at least one `newCapabilities` entry.
  `accept` refuses one that lists none as `invalid-input`. A change to an
  existing spec that needs no new capability routes `bounded-change`, whose plan
  binds the one spec `affectedSpecIds` names.
- The shipped `qfai-run` payload reference says the same to the agent writing
  the proposal.
- `spec-0018` gains `TC-0018-0271`: on the built CLI, a `feature` proposal with
  no new capability is refused, and the same change routed `bounded-change`
  binds its spec and runs its plan to `workOrder: null`.

No code, plan, schema or field changes.

## Options (at least 3) and recommendation

| #   | Option                                                                                  | Cost                                                                                            | Risk                                                               | Recommended |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------- |
| 1   | Route the change to `bounded-change`                                                    | One contract paragraph, one skill line, one TC                                                  | None found: the core already refuses the `feature` proposal        | ✅          |
| 2   | Skip the `feature` plan's `sdd` stage when there is no new capability                   | A new plan predicate, and a `feature` run with no CREATE approval in plan checks and completion | Two routes that do the same work, and a `feature` run with no slot |             |
| 3   | Run `sdd_delta` in place of `sdd` in the `feature` plan when there is no new capability | A per-run stage substitution, which no plan does today                                          | The plan file stops being the list of stages the run follows       |             |

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                |
| -------------------- | ------------ | ------------------------------------------------------------- |
| `spec-0018/TDD-0532` | `ledger-row` | Its test case, `TC-0018-0271`, states the route this CR picks |

- Not blocked by this CR: every `feature` case that names a new capability.
- Overlapping open CRs: none. `CR-20260925-0023` is approved and applied; this
  CR corrects one run its context names and changes none of its rules.

## Impact scope

- Specs: `spec-0018` `TC-0018-0271` and its ledger row
- Plans: none
- Tests: `TC-0018-0271`
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`
- Schema: none
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`,
  `.qfai/specs/spec-0018/tdd/test-list.md`

## Decision needed from user

Which route does a change to an existing spec that needs no new capability take?

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the approver and time here.
2. `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive`
   mode for the `### Route proposal` paragraph. Record this CR in the
   `09_delta.md` of every spec that references CLI-WF.
3. `/qfai-sdd spec-0018` in `re-derive` mode for `TC-0018-0271`, seeding
   `TDD-0532` at `todo`.
4. `/qfai-implement spec-0018` takes `TDD-0532` through its cycle.

## Resolution

Pending explicit approval and the owner reruns.
