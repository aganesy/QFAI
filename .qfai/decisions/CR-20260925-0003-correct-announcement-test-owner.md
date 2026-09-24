# Change Request

- ID: `CR-20260925-0003`
- Title: `Correct the owner of the checked-plan unit test`
- Raised by: `qfai-implement`
- Raised at: `2026-09-24T16:02:43Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user` — explicit answer: "承認する（推奨）"
- Approved at: `2026-09-24T18:13:52Z`
- Approved option: `-`
- Applied at: `2026-09-24T18:36:12Z`
- Superseded by: `-`

## Context

`TC-0018-0010` tests the plan in the JSON verdict returned by `decide accept`. Its ledger row, `TDD-0014`, names the shipped `qfai-run/SKILL.md` as the owning module. That asset is planned for U2 and does not implement the core verdict. `TC-0018-0011` and `TDD-0261` separately cover the skill's announcement text.

## Reproduction

- `.qfai/specs/spec-0018/06_Test-Cases.md:51`: `TC-0018-0010` expects the verdict plan to hold the goal, ordered stages and write scope, with no question opened; the note calls this the JSON half.
- `.qfai/specs/spec-0018/tdd/test-list.md:310`: `TDD-0014` points its `Owning module` to `packages/qfai/assets/init/.qfai/assistant/skills/qfai-run/SKILL.md`.
- `.qfai/specs/spec-0018/10_Plan.md:40-42,76-93`: the core decision function belongs to U1; `qfai-run` belongs to U2. The named skill asset does not yet exist.
- `.qfai/specs/spec-0018/06_Test-Cases.md:52` and `.qfai/specs/spec-0018/tdd/test-list.md:557`: the skill-text assertion has its own `TC-0018-0011` and `TDD-0261`.

## Proposed change

In the SDD Phase 2b ledger seed, change only `spec-0018/TDD-0014`'s `Owning module` to `packages/qfai/src/core/workflow/decide.ts`. Keep its test case, test file, selector, layer, tier and obligation intact. Keep `TDD-0261` owned by the shipped skill asset.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                         |
| -------------------- | ------------ | ---------------------------------------------------------------------- |
| `spec-0018/TDD-0014` | `ledger-row` | Its seeded production owner cannot satisfy its JSON-verdict assertion. |

- Not blocked by this CR: `TDD-0015` onward and `TDD-0261`, whose obligations and owners do not change.
- Related CR: `CR-20260924-0002` names the same ledger but does not block `TDD-0014`. It was applied before this owner rerun.

## Impact scope

- Specs: `spec-0018` ledger ownership metadata
- Plans: none
- Tests: `spec-0018/TDD-0014` remains a Unit test with the same `TC-0018-0010` obligation
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0018/tdd/test-list.md`, `.qfai/specs/spec-0018/09_delta.md`

## Decision needed from user

Approve the correction of `TDD-0014`'s owning module to `decide.ts`, keeping the existing test obligation and the separate skill-text test unchanged.

## Approved actions (owner skill rerun plan)

1. On approval and after `CR-20260924-0002` is applied, run `/qfai-sdd spec-0018` Phase 2b in `re-derive` mode for the ledger owner field. Record this correction in `spec-0018/09_delta.md`.
2. Sweep the spec-0018 ledger. `TDD-0014`'s obligation is unchanged, so release `blocked -> todo` after the owner rerun. Reset or retire no rows.
3. Resume `TDD-0014` against the corrected owner and record the outcome here.

## Resolution

Approved by the user. The timestamp above records when this approval was entered; the answer's original timestamp is unavailable. After `CR-20260924-0002` was applied, `/qfai-sdd spec-0018` ran in `re-derive` mode for Phase 2b. `TDD-0014` now names `packages/qfai/src/core/workflow/decide.ts` and is released from `blocked` to `todo`. Its `TC-0018-0010` obligation, test file, selector, layer, tier and evidence remain unchanged. `TDD-0261` still owns the shipped skill-text assertion. The ledger sweep found no changed `TC`, `US` or `CON-API` obligation, so no row was reset or retired. CR4's parked rows remain blocked. Implementation resumes in a separate run.
