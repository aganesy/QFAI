# Change Request

- ID: `CR-20260923-0008`
- Title: `The auto-serve SIGINT case still describes iterate killing child servers`
- Raised by: `qfai-implement`
- Raised at: `2026-09-23T08:45:30Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T08:46:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T08:46:05Z` — see Resolution
- Superseded by: `-`

## Context

`REQ-0012-0062` states a runner contract: iterate invokes the teardown its
server runner returns at the end of the cycle and on SIGINT. The default runner
is an in-process server with no child processes.

`TC-0012-0462` still verifies the SIGINT path as iterate killing child servers:

> spawning iterate + sending SIGINT triggers `tree-kill` / `taskkill /F /T` of
> all child server processes within 2s

Its row `TDD-0471` is `done`. Its `Selector` is the describe title
`iterate --auto-serve SIGINT teardown`, which matches three tests, and each
observes a different clause:

| Test                                                                                       | What it observes                                               |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `installs a SIGINT handler after the runner returns and removes it after cycle completion` | The handler is installed for the cycle and removed at its end  |
| `auto-serve teardown + SIGINT detach happen even when the mirror helper throws`            | Teardown and removal still happen when the cycle fails         |
| `teardown executes within 2s when SIGINT is dispatched mid-run`                            | SIGINT invokes the runner's teardown within the NFR-0106 bound |

`qfai-implement/references/selector-granularity.md` allows one boundary per row.

## Options (at least 3) and recommendation

| #   | Option                                                                                            | Cost                               | Risk                                             | Recommended |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------ | ----------- |
| 1   | Restate `TC-0012-0462` as the runner contract's SIGINT path, and split `TDD-0471` into three rows | One case restated, two rows seeded | None found; no test or product change            | ✅          |
| 2   | Restate the case and keep one row, narrowing its `Selector` to the SIGINT test                    | One case, one cell                 | Two clauses of the case would have no row        |             |
| 3   | Leave the case as it is                                                                           | None                               | The row pins a contract its own case contradicts |             |

## Proposed change

Option 1.

1. `TC-0012-0462` verifies `REQ-0012-0062`'s SIGINT path as three clauses: the
   SIGINT handler is installed after the runner returns and removed at the end
   of the cycle; teardown and removal still happen when the cycle fails; and a
   SIGINT during the cycle invokes the runner's teardown once, within the
   NFR-0106 bound.
2. `TDD-0471` returns to `todo` with this record in `DR-ID`, keeps the first
   test alone, and takes the `Boundary` `sigint-handler-installed-and-removed`.
3. `/qfai-sdd` Phase 2b seeds two `Integration` rows on `TC-0012-0462` at
   `todo`, with this record in `DR-ID` and `Test file` and `Selector` `-`:
   `TDD-0565` (`teardown-and-removal-survive-a-failed-cycle`) and `TDD-0566`
   (`sigint-invokes-teardown-within-bound`).

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                   |
| -------------------- | ------------ | ---------------------------------------------------------------- |
| `spec-0012/TDD-0471` | `ledger-row` | Its case is restated, and its `Selector` conflates three clauses |

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`

## Decision needed from user

Approve option 1: restate the SIGINT case as the runner contract and split its
row into three?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012` makes steps 1 to 3, and records this request in
   `09_delta.md`.
2. `/qfai-atdd spec-0012` hands the three rows over on the falsifiability path.
3. `/qfai-implement spec-0012` takes each row through it.

## Resolution

Applied under option 1.

- `TC-0012-0462` verifies the runner contract's SIGINT path as three clauses.
- `TDD-0471` is back at `todo` on the first clause, with this record in `DR-ID`.
- `TDD-0565` and `TDD-0566` are seeded on the other two.
- `spec-0012/09_delta.md` records this request.
