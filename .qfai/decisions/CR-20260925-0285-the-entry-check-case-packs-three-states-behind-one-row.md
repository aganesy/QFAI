# Change Request

- ID: `CR-20260925-0285`
- Title: `The entry-check case packs three states behind one ledger row`
- Raised by: `qfai-implement`
- Raised at: `2026-09-25T10:40:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`TC-0001-0026` verifies three states of the stage-skill entry check that the
shipped operating baseline states as three rows of its
`## Workflow Run Entry Check` table:

- `pass-on`: mode `active`, no name and no work order. Edit nothing and pass the
  request to `qfai-run` in the same turn, in at most one line.
- `worker`: mode `active` with a work order. Check the run, stage and work-order
  IDs, then do only that work.
- `off`: modes `off` and `shadow`. No entry check.

The contract section `host:stage-skill-handover` and `EX-0001-0026` also list
them as separate states. The same table's two other states each have a row of
their own: `by-name` is `TDD-0038` and `error` is `TDD-0036`.

The case has one ledger row, `TDD-0035`, and one test,
`TC-0001-0026: the entry check hands over, works the order, or is off` in
`packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`. That
test asserts all three states in one function, so it can fail only once per
run. Whatever state is checked first hides the other two. The RED recorded
when the row closed at `exception` under `DR-0298` failed on the first line,
"the section exists", so no state-specific assertion has ever been seen
failing.

`selector-granularity.md` requires one independently observable boundary per
row and says a matrix-shaped test case is split before RED. The split is
`/qfai-sdd` Phase 2b's write, so `/qfai-implement` stops the row and raises this
request instead of splitting it.

## Proposed change

Option 1.

1. `TDD-0035` keeps `TC-0001-0026`, `DR-0298` and its `BR-Ref`, takes the
   `Boundary` `pass-on`, and its `Selector` narrows to the `pass-on` case.
2. `/qfai-sdd` Phase 2b seeds two `Integration` rows on `TC-0001-0026` at
   `todo`, with this record in `DR-ID`, `BR-Ref` `BR-0001-0025`, and `Test file`
   and `Selector` `-`: one with the `Boundary` `worker`, one with `off`.
3. `/qfai-atdd` splits the test into one case per state and hands the three rows
   over.

`06_Test-Cases.md` is unchanged: the case's verify text already names the three
states, and one test case may be carried by several rows.

## Options (at least 3) and recommendation

| #   | Option                                                                                      | Cost                                             | Risk                                                                                                         | Recommended |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------- |
| 1   | Keep `TDD-0035` for `pass-on`, seed one row each for `worker` and `off`, and split the test | Two rows, one test split into three cases        | None found. No criterion, rule, example or product text changes                                              | ✅          |
| 2   | Split `TC-0001-0026` itself into three test cases, each with its own example and row        | Three test cases, two new examples, two new rows | Restates what `EX-0001-0026` and `BR-0001-0025` already say in one place, so the state list is kept in three |             |
| 3   | Keep one row and record three mutation runs under its one selector, one per state           | Three mutation runs                              | Breaks the one-boundary-per-row rule, and the row still reports one outcome for three states                 |             |
| 4   | Leave the row as it is                                                                      | None                                             | `worker` and `off` stay unobserved, and the row cannot reach `done` on a RED the rule calls invalid          |             |

## Blocked downstream items

- `TDD-0035` — `todo -> blocked`, `Blocked-By`
  `CR-20260925-0285 — blocked at todo`.
- Not blocked by this CR: every other `spec-0001` row. `TDD-0036` shares the test
  file and reads only the `error` state.
- Overlapping open CRs: none name `TC-0001-0026` or `TDD-0035`.

## Impact scope

- Specs: `spec-0001`
- Plans: `none`
- Tests: `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
  gains two cases, written by `/qfai-atdd`
- Contracts: `none`
- Schema: `none`
- Reviewed unchanged: `.qfai/specs/spec-0001/03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md` and `06_Test-Cases.md`
- Upstream paths edited under this CR: `.qfai/specs/spec-0001/09_delta.md`,
  `.qfai/specs/spec-0001/tdd/test-list.md`

## Decision needed from user

Approve option 1: keep `TDD-0035` for the `pass-on` state, seed one row each
for `worker` and `off`, and split the test into three cases?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0001`, mode `re-derive`, makes steps 1 and 2 of
   `## Proposed change` and records this request in `09_delta.md`.
2. `/qfai-implement` Stage 0 returns `TDD-0035` to `todo`, records this request
   in its `DR-ID` and clears its `Blocked-By`.
3. `/qfai-atdd spec-0001` splits the test and hands the three rows over.
4. `/qfai-implement spec-0001` takes each row through its lifecycle with its
   reviews.

## Resolution

Open.
