# Change Request

- ID: `CR-20260923-0013`
- Title: `A renamed test leaves its completed row on a stale proof`
- Raised by: `qfai-implement`
- Raised at: `2026-09-23T11:50:30Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on this change
- Approved at: `2026-09-23T11:51:00Z`
- Approved option: `-`
- Applied at: `2026-09-23T11:52:00Z` — see Resolution
- Superseded by: `-`

## Context

`CR-20260923-0011` recorded that the `TDD-0037` test names in
`packages/qfai/tests/integration/shippedWorkflowInertness.test.ts` still read
"two installing job declarations, four and three executing instances", while
the case asserts three declarations, nine instances and eight. `/qfai-atdd`
renamed the `describe` and the `it`. It replaced the row's `RED test hash` and
marked its proof stale, because the proof was taken on the old test.

`TDD-0037` is `done`, and `done` has one exit: the upstream reset.
`CR-20260923-0011` does not name the row in its approved actions. Its blocked
items list says the row is not blocked by it. So `/qfai-implement` cannot re-take
the proof, and the row stays `done` on a proof taken against a test that no
longer exists under that name.

The row's evidence also still lives in `implement-spec-0003.md`, while an
`Integration` row's evidence belongs in `atdd-spec-0003.md`. That mismatch is why
`validate` reports `QFAI-TDDLIST-008` and `QFAI-TDDLIST-011` on it.

## Reproduction

From `05fe504d5d1c2e636744532f80976adec2c8893c`, the revision this request was
raised on. The ledger row and the test carry the renamed title:

```text
.qfai/specs/spec-0003/tdd/test-list.md
 41: | TDD-0037 | ... | ... three installing job declarations, nine and eight executing instances, ... | done | ... implement-spec-0003.md#tdd-0037 |
packages/qfai/tests/integration/shippedWorkflowInertness.test.ts
360: describe("TC-0003-0037 (TDD-0037): three installing job declarations, nine and eight executing instances, zero secret references", () => {
```

The proof the row's `Evidence` cell points at was taken under a title no test
carries any more:

```text
.qfai/evidence/implement-spec-0003.md
1763: - Selector: `TC-0003-0037 (TDD-0037): exactly one installing job and zero secret references`
```

The row's own handover marks that proof stale:

```text
.qfai/evidence/atdd-spec-0003.md
937: - Round 1: RED test replacement: test-only replacement — ... the proof at
     .qfai/evidence/implement-spec-0003.md#tdd-0037 is stale — test replaced, ...
```

## Proposed change

1. `TDD-0037` goes to `todo` with this record in `DR-ID`. Its `TC-Refs`,
   `Test file` and `Selector` stay as they are. The `Selector` already names the
   renamed `describe`.
2. `/qfai-implement` re-takes the row's proof on the falsifiability branch, using
   the `/qfai-atdd` handover in `atdd-spec-0003.md#tdd-0037`. It writes the round
   there, and the `Evidence` cell points there.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                    |
| -------------------- | ------------ | ------------------------------------------------- |
| `spec-0003/TDD-0037` | `ledger-row` | Its proof was taken on the test before the rename |

## Impact scope

- Specs: `spec-0003`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0003/tdd/test-list.md`,
  `.qfai/specs/spec-0003/09_delta.md`

## Decision needed from user

Approve the reset of `TDD-0037`, so its proof is re-taken on the renamed test?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003` records this request in `09_delta.md`, and resets
   `TDD-0037` to `todo` with this record in `DR-ID`. No other row.
2. `/qfai-implement spec-0003` takes `TDD-0037` through the cycle.

## Resolution

Applied.

- `TDD-0037` is at `todo` with this record in `DR-ID`.
- `spec-0003/09_delta.md` records this request.
