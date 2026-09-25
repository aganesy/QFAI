# Change Request

- ID: `CR-20260923-0004`
- Title: `One spec-0012 ledger row carries four boundaries of the runner contract`
- Raised by: `qfai-implement`
- Raised at: `2026-09-23T07:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T07:01:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T07:03:00Z` — see Resolution
- Superseded by: `-`

## Context

`CR-20260923-0002` restated `TC-0012-0442` so that its four blocks name the
runner contract they verify. `TDD-0469` is the one ledger row for that case, and
its `Selector` names four tests:

| Selector entry                                                             | The boundary it observes                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `does not invoke the server runner when --auto-serve is absent`            | With the flag off, `iterate` calls no runner                         |
| `calls the runner once and invokes the returned teardown at cycle end`     | With the flag on, the runner is called once and torn down at the end |
| `accepts runner.ok=true (recovery path) and continues to cycle completion` | A runner reporting a recovered owner is adopted, teardown included   |
| `returns exit 2 with PID + owning command on stderr when runner refuses`   | A refusing runner ends the cycle with exit 2 and its reason          |

Each entry verifies a different clause of the restated case, and each is broken
by a different production line. The recovery entry and the teardown entry run
the same ok path, so a mutation that breaks one also fails the other; they
stay separate rows because the case states them as separate clauses.
`qfai-implement/references/selector-granularity.md` allows one boundary per
row, and a row carrying more is split by `/qfai-sdd` Phase 2b, not in place.
`qfai-implement` Phase Red step 1 stops such a row at selection.

## Options (at least 3) and recommendation

| #   | Option                                                                             | Cost                                    | Risk                                                                                      | Recommended |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| 1   | Split `TDD-0469` into four rows on `TC-0012-0442`, one per boundary                | Three rows seeded, one row re-scoped    | None found; the tests exist and each has its own falsifying mutation                      | ✅          |
| 2   | Keep one row and narrow its `Selector` to one entry                                | One cell                                | Three boundaries the case restates would have no row                                      |             |
| 3   | Split `TC-0012-0442` into four test cases, one per boundary, each with its own row | Four cases restated or added, four rows | Reopens the case `CR-20260923-0002` just restated, for a split the ledger alone can carry |             |

## Proposed change

Option 1, as `/qfai-sdd spec-0012` Phase 2b's write.

1. `TDD-0469` keeps `TC-0012-0442` and the first entry alone, with the
   `Boundary` `flag-off-calls-no-runner`.
2. Three `Integration` rows are seeded on `TC-0012-0442`, at `todo`, with
   `DR-ID` `CR-20260923-0004` and `Test file` and `Selector` `-`:
   - `runner-called-once-torn-down-at-end`;
   - `recovered-owner-adopted-with-teardown`;
   - `refusing-runner-exits-2-with-reason`.
3. `/qfai-atdd spec-0012` writes a handover entry for each new row and narrows
   `TDD-0469`'s entry to its one boundary.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                           |
| -------------------- | ------------ | -------------------------------------------------------- |
| `spec-0012/TDD-0469` | `ledger-row` | Its `Selector` conflates four boundaries until it splits |

- Overlapping open CRs: `CR-20260923-0001` also seeds spec-0012 rows. It names
  its ids as the next free ones when it is applied, so it takes the ids after
  this record's.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none`; the four tests exist
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/tdd/test-list.md`

## Decision needed from user

Approve option 1: split `TDD-0469` into four rows, one per boundary of
`TC-0012-0442`?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012` Phase 2b makes the ledger edits in
   `## Proposed change` steps 1 and 2.
2. `/qfai-atdd spec-0012` writes the handover entries in step 3.
3. `/qfai-implement spec-0012` takes each of the four rows through the
   falsifiability path.

## Resolution

The Context was corrected after approval: it first called the four entries
independently observable, and the recovery and teardown entries are not, since
both run the same ok path. The approved option is unchanged.

Applied under option 1.

- `TDD-0469` names the first entry alone, with the `Boundary` `flag-off-calls-no-runner`.
- `TDD-0562`, `TDD-0563` and `TDD-0564` are seeded on `TC-0012-0442` for the other three
  boundaries, at `todo`, with this record in `DR-ID`.
