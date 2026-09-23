# Change Request

- ID: `CR-20260923-0009`
- Title: `The auto-serve teardown bound is cited but never stated`
- Raised by: `qfai-implement`
- Raised at: `2026-09-23T09:20:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T09:20:30Z`
- Approved option: `1`
- Applied at: `2026-09-23T09:27:13Z` — see Resolution
- Superseded by: `-`

## Context

`REQ-0012-0076` and `TC-0012-0462` require the runner's teardown on SIGINT to
complete "within the NFR-0106 bound". `NFR-0106` in `01_Spec.md` states no
bound:

> `--auto-serve` MUST NOT kill foreign processes (BR-protected; verified by
> integration test).

The only number the pack held was the "within 2s" of the old `TC-0012-0462`,
which `CR-20260923-0008` restated. The traceability ledger still reads
"SIGINT teardown ≤2s (NFR-0106)", and the test asserts `toBeLessThan(2_000)`.
So a test and a row's `Selector` pin a value that no statement gives.

`CR-20260923-0008` also dropped the old case's clause that an asynchronous
cleanup error is surfaced on stderr, naming what failed. `teardownOnce` still
warns when a teardown fails, and no case now requires it.

## Options (at least 3) and recommendation

| #   | Option                                                                      | Cost           | Risk                                                                              | Recommended |
| --- | --------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- | ----------- |
| 1   | State the 2-second bound in `NFR-0106`, where both references already point | One statement  | None found; the bound is what the tests and the ledger already hold               | ✅          |
| 2   | State the bound in `TC-0012-0462` and drop the `NFR-0106` reference         | One case       | Reopens every row on the case, and `REQ-0012-0076` still points at an empty bound |             |
| 3   | Drop the bound from the statements and the test                             | Two statements | A teardown that hangs on SIGINT would pass                                        |             |

## Proposed change

Option 1.

1. `NFR-0106` also states that when `--auto-serve` is on, the runner's teardown
   completes within 2 seconds of a SIGINT.
2. The dropped cleanup-error clause is not restored here. Restoring it is a new
   obligation with its own case and row, so it is filed separately.

## Blocked downstream items

None. `TC-0012-0462` is unchanged, so the rows on it keep their case. Their
tests already assert the bound this record states.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/01_Spec.md`,
  `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve option 1: state the 2-second teardown bound in `NFR-0106`?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012` makes step 1 and records this request in
   `09_delta.md`.

## Resolution

Applied under option 1.

- `NFR-0106` states the 2-second teardown bound on SIGINT.
- `spec-0012/09_delta.md` records this request.
