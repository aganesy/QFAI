# Change Request

- ID: `CR-20260924-0010`
- Title: `The failed-teardown case names a test file that does not hold its test`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-24T02:18:01Z`
- Class: `intent`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-24T02:18:30Z`
- Approved option: `1`
- Applied at: `2026-09-24T02:19:00Z` — see Resolution
- Superseded by: `-`

## Identifier

This record was merged as `CR-20260924-0002`. The main branch already gave that
ID to the record splitting the CI acceptance boundaries, so this one is
`CR-20260924-0010`. Commit messages written before the change keep the old ID.

## Context

`CR-20260924-0009` added `TC-0012-0490` to
`.qfai/specs/spec-0012/06_Test-Cases.md`. Its `Test file:` line names
`packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts`.

`/qfai-atdd` wrote the case's test in a new file instead:
`packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts`.
Four `done` rows take their proof from the other file: `TDD-0469`, `TDD-0562`,
`TDD-0563` and `TDD-0564`. Each row's `RED test manifest` names that file, so
adding a test to it would move their `RED test hash`. A separate file leaves
those proofs as they are.

The case therefore names a file that does not hold its test. The `/qfai-atdd`
handover for `TDD-0577` records this under Gaps / Open risks in
`.qfai/evidence/atdd-spec-0012.md`. Correcting the line is a change to
`06_Test-Cases.md`, which only `/qfai-sdd` may make.

| Artifact                                                  | What it says                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `.qfai/specs/spec-0012/06_Test-Cases.md`, `TC-0012-0490`  | `Test file:` `.../prototypingIterate.autoServe.test.ts`                |
| `.../prototypingIterate.autoServe.test.ts`                | Annotated `TC-0012-0442` only; no test for `TC-0012-0490`              |
| `.../prototypingIterate.autoServeTeardownFailure.test.ts` | Annotated `TC-0012-0490`; holds the case's test                        |
| `.qfai/evidence/atdd-spec-0012.md#tdd-0577`               | `Test file:` `.../prototypingIterate.autoServeTeardownFailure.test.ts` |

## Options (at least 3) and recommendation

| #   | Option                                                                                  | Cost                                                                  | Risk                                                                                             | Recommended |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| 1   | Re-point the `Test file:` line of `TC-0012-0490` to the new file                        | One line in `06_Test-Cases.md`                                        | None found; the case's obligation and every ledger row stay as they are                          | ✅          |
| 2   | Move the test into `prototypingIterate.autoServe.test.ts`, and leave the case unchanged | A test move, and a reset of the four `done` rows whose RED hash moves | Reopens four completed rows to keep one line of the spec as written                              |             |
| 3   | Leave the line as it is                                                                 | None                                                                  | The case names a file that does not hold its test, and a reader following the line finds nothing |             |

## Proposed change

Option 1. The `Test file:` line of `TC-0012-0490` names
`packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServeTeardownFailure.test.ts`.
Nothing else about the case changes: its `EX-Ref`, `AC-Refs`, `Type`, `Level`
and `Verify` line stay as written.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                           |
| -------------------- | ------------ | -------------------------------------------------------- |
| `spec-0012/TDD-0577` | `ledger-row` | Its `TC-Refs` names `TC-0012-0490`, whose line is edited |

- Not blocked by this CR: `spec-0012/TDD-0469`, `TDD-0562`, `TDD-0563` and
  `TDD-0564`. They read the other file, and option 1 leaves it and their rows
  untouched.
- Overlapping open CRs: `none`. `CR-20260924-0009` names `06_Test-Cases.md` too
  and is applied; this request assumes it has landed.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve option 1: re-point the `Test file:` line of `TC-0012-0490` to the file
that holds its test?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`, rewrites the `Test file:` line of
   `TC-0012-0490` and records this request in `09_delta.md`.
2. Downstream ledger sweep: none. The case's obligation is unchanged, so no row
   is reset or retired. `TDD-0577` stays at `todo` with `CR-20260924-0009` in
   `DR-ID`, and `/qfai-implement` fills its `Test file` and `Selector` from the
   `/qfai-atdd` handover.

## Resolution

Applied under option 1.

- `/qfai-sdd spec-0012` rewrote the `Test file:` line of `TC-0012-0490` in
  `.qfai/specs/spec-0012/06_Test-Cases.md`.
- `spec-0012/09_delta.md` records this request.
- Ledger rows reset: none. Ledger rows retired: none.
