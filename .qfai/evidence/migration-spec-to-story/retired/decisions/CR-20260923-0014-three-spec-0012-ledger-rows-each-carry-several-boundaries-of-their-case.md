# Change Request

- ID: `CR-20260923-0014`
- Title: `Three spec-0012 ledger rows each carry several boundaries of their case`
- Raised by: `qfai-atdd`
- Raised at: `2026-09-23T20:52:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T20:53:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T20:55:46Z` — see Resolution
- Superseded by: `-`

## Context

`CR-20260923-0001` reset `TDD-0514`, `TDD-0515` and `TDD-0497` to `todo` and
named a test case on each. The `/qfai-atdd` run started
2026-09-23T11:30:58.834Z did not hand them over. Each case states several
boundaries, and the run measured them by mutation. Its entries in
`.qfai/evidence/atdd-spec-0012.md` group the tests by boundary and name the
mutation that fails each group.

`qfai-implement/references/selector-granularity.md` allows one boundary per
row, and a row carrying more is split by `/qfai-sdd` Phase 2b, not in place.
`qfai-implement` Phase Red step 1 stops such a row at selection.

### `TDD-0514` on `TC-0012-0484`

| Boundary                                                                                                            | Tests, at line | Mutation that fails them                      |
| ------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------- |
| `--capture` on the command line turns capture on; its absence leaves it off                                         | 131, 143       | delete `args.ts:932`                          |
| With no screens injected, screens come from the UI contracts, `.yaml` or `.yml`                                     | 410, 602       | `screenContracts.ts:144` glob to `**/*.json`  |
| With no runner injected, iterate uses the default Playwright runner, and a run without Playwright exits 2 naming it | 652            | `prototypingIterate.ts:1535` to a stub runner |

Tests 202 and 208 carry the case's annotation and hold none of these
boundaries: neither lets iterate choose the runner, and both pass under the
line-1535 mutation. Test 652 observes the default runner only through its
missing-Playwright outcome, which is the one CI can reach, so the two halves of
the third clause are one boundary.

### `TDD-0515` on `TC-0012-0485`

| Boundary                                                                       | Tests, at line | Mutation that fails them                                    |
| ------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------- |
| `--auto-serve` on the command line turns serving on; its absence leaves it off | 139, 151       | delete `args.ts:942`                                        |
| With `--auto-serve` absent, iterate calls no runner                            | 228            | `prototypingIterate.ts:1281` to `autoServe ?? serverRunner` |
| With no runner injected, iterate uses the default server runner                | 179            | `prototypingIterate.ts:1294` to a stub runner               |
| The default runner's teardown resolves within 2000 ms                          | 267            | `defaultServerRunner.ts:174` to `setTimeout(resolve, 2500)` |

The second boundary is already a row. `TDD-0469`, `flag-off-calls-no-runner` on
`TC-0012-0442`, owns the line-1281 predicate and observes it with an assertion.
Test 228 observes it only as a `TypeError`, because its stub is a bare `vi.fn()`.

The fourth is not the SIGINT bound `TDD-0566` holds on the default branch. That
case injects a runner, so the default runner's own teardown is outside it. Test
267 fails under the mutation on its own `Promise.race` error, `teardown exceeded
2s budget`, which states the bound under test. That error is the expected
reason.

### `TDD-0497` on `TC-0012-0488`

| Boundary                                                                    | Tests, at line | Mutation that fails them (`prototypingIterate.ts` unless named) |
| --------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| A `converged` record with a non-negative accepted index exits 0 and reports | 66             | line 3297 `!== null` to `=== null`                              |
| Any other recorded state exits 2 with `Not converged` and its reason        | 90, 117, 141   | line 3327 `return 2;` to `return 0;`                            |
| A missing `prototyping.json` exits 2 with a diagnostic                      | 165            | line 3271 `return 2;` to `return 0;`                            |
| `--check-convergence` parses as a known flag                                | 216 (a)        | delete `args.ts:922`                                            |
| The peek reports cycle 9 without `--cycle`, or the cycle given              | 216 (b), 185   | line 459 `9` to `0`; line 473 `options.cycle` to `9`            |
| The peek writes nothing                                                     | 252            | line 3286, a `writeFile` inserted before `info(header)`         |

Test 216 holds the fourth and fifth boundaries. Its first half calls
`parseArgs`, and its second calls `runPrototypingIterate` with no cycle; neither
half depends on the other. A mutation of the parse fails it before the cycle is
ever read, so the test cannot give the fifth boundary a RED of its own.

The three recorded states of the second boundary share one outcome and one
`return 2;`. Tests 117 and 141 match their reason word on the `stopReason:` line
the peek prints for every state, so a row per state would have no oracle of its
own for the reason text.

## Options (at least 3) and recommendation

| #   | Option                                                                                                            | Cost                                        | Risk                                                                                                                 | Recommended |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Split each row into one row per boundary its case states, and seed no row for a boundary another row already owns | Nine rows seeded, three rows re-scoped      | Test 216 must be separated before its two rows can be handed over                                                    | ✅          |
| 2   | As option 1, but one row per recorded state in `TDD-0497`'s second boundary                                       | Eleven rows seeded, three rows re-scoped    | Two of the three rows have no oracle for the reason text, so their RED is the exit code the shared row already holds |             |
| 3   | Split `TC-0012-0484`, `0485` and `0488` into one test case per boundary, each with its own row                    | Twelve cases restated or added, twelve rows | Reopens the cases `CR-20260923-0001` just restated, for a split the ledger alone can carry                           |             |

Option 2 was weighed and not taken. `selector-granularity.md` counts two
rejection reasons as two boundaries. Here the three states are one decision
reached from three inputs, like one rejection reached through two channels.
Test 90 is the closest case: its reason has its own branch and its own
assertion. If `/qfai-implement` finds that branch needs its own RED, it can be
split later through another request.

## Proposed change

Option 1, as `/qfai-sdd spec-0012` Phase 2b's write.

1. Each original row keeps its case and its first boundary, and its `Selector`
   is narrowed to that boundary's tests:
   - `TDD-0514`: `capture-flag-parses-on-and-off`, tests 131 and 143;
   - `TDD-0515`: `auto-serve-flag-parses-on-and-off`, tests 139 and 151;
   - `TDD-0497`: `converged-record-exits-0-and-reports`, test 66.
2. Nine `Integration` rows are seeded, at `todo`, with `DR-ID`
   `CR-20260923-0014`, `Test file` and `Selector` `-`, and the `BR-Ref` their
   case derives:

   | Case           | `BR-Ref`       | Boundary                                             |
   | -------------- | -------------- | ---------------------------------------------------- |
   | `TC-0012-0484` | `BR-0012-0047` | `screens-derived-from-yaml-and-yml-contracts`        |
   | `TC-0012-0484` | `BR-0012-0047` | `default-playwright-runner-used-and-missing-exits-2` |
   | `TC-0012-0485` | `BR-0012-0048` | `default-server-runner-used`                         |
   | `TC-0012-0485` | `BR-0012-0048` | `default-runner-teardown-within-2000-ms`             |
   | `TC-0012-0488` | `BR-0012-0067` | `unconverged-record-exits-2-with-reason`             |
   | `TC-0012-0488` | `BR-0012-0067` | `missing-record-exits-2`                             |
   | `TC-0012-0488` | `BR-0012-0067` | `flag-parses-as-peek`                                |
   | `TC-0012-0488` | `BR-0012-0067` | `cycle-defaults-to-9-or-reports-given`               |
   | `TC-0012-0488` | `BR-0012-0067` | `peek-writes-nothing`                                |

3. No row is seeded for `TDD-0515`'s second boundary. The part of
   `TC-0012-0485` that says the flag's absence starts no server is observed at
   iterate by `TDD-0469`.
4. No test case is restated. Every clause of the three cases maps to a boundary
   above, or to `TDD-0469`.
5. `/qfai-atdd spec-0012` separates test 216 into a parse test and a
   default-cycle test, and writes a handover entry for each new row. It also
   decides whether tests 202, 208 and 228 keep their annotation, since none is
   a selector entry of any row.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                       |
| -------------------- | ------------ | -------------------------------------------------------------------- |
| `spec-0012/TDD-0514` | `ledger-row` | Its case holds three boundaries until the row splits                 |
| `spec-0012/TDD-0515` | `ledger-row` | Its case holds four boundaries, one owned elsewhere, until it splits |
| `spec-0012/TDD-0497` | `ledger-row` | Its case holds six boundaries until the row splits                   |

- Overlapping open CRs: none. `CR-20260923-0001` is applied, and this record
  re-scopes the rows it reset.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none` here; `/qfai-atdd` separates test 216
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/tdd/test-list.md`,
  `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve option 1: split `TDD-0514`, `TDD-0515` and `TDD-0497` into one row per
boundary, and name `TDD-0469` for the boundary it already owns?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012` Phase 2b makes the ledger edits in
   `## Proposed change` steps 1 and 2, and records this request in
   `09_delta.md`.
2. `/qfai-atdd spec-0012` makes step 5.
3. `/qfai-implement spec-0012` takes each of the twelve rows through the
   falsifiability path.

## Resolution

Applied under option 1.

- `TDD-0514`, `TDD-0515` and `TDD-0497` name their first boundary alone, with
  this record in `DR-ID`.
- `TDD-0568` and `TDD-0569` are seeded on `TC-0012-0484`, `TDD-0570` and
  `TDD-0571` on `TC-0012-0485`, and `TDD-0572` to `TDD-0576` on `TC-0012-0488`,
  in the order of the table in step 2, at `todo`, with this record in `DR-ID`.
- `spec-0012/09_delta.md` records this request.
- The three narrowed selectors now resolve on `todo` rows, so
  `npx qfai validate` reports `TDDLIST_STALE_STATUS` on each until
  `/qfai-implement` advances it.
