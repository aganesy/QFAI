# Change Request

- ID: `CR-20260925-0008`
- Title: `The batch-mode test case checks one clause of the stable-mapping criterion it cites`
- Raised by: `requirements-analyst`
- Raised at: `2026-09-25T01:52:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-25T01:53:00Z`
- Approved option: `1`
- Applied at: `2026-09-25T01:55:00Z` — see Resolution
- Superseded by: `-`

## Context

`AC-0013-0027` states three things about a run with no argument:

1. the order in `_policies/03_Capabilities.md` decides which spec id each
   capability gets;
2. an id already assigned keeps its spec;
3. reordering the mapping is a Change Request.

`TC-0013-0010` cites it, and its verify text names only the targeting of every
capability. Its tests check that and the per-spec delegation, and nothing else.

- No test fails when a catalog moves an assigned spec id to another capability.
  The validator already reports it: `QFAI-SPLIT-105` fires when a spec's
  `01_Spec.md` does not name the capability the catalog now pairs it with. That
  holds for a catalog with a `Spec` column and for one paired by row order.
- No test fails when the `qfai-sdd` skill stops requiring a Change Request to
  reorder the mapping. The skill states it in its Arguments section:
  "Reordering capability-to-spec mapping is a Change Request decision and must
  not be done implicitly."

`CR-20260923-0010` recorded this gap as left open, outside its scope.

The case's one ledger row, `TDD-0010`, is `exception` under `DR-0013-0001`. Its
`Selector` is the describe title of the two existing tests, and both observe the
first clause.

## Proposed change

Option 1.

1. `TC-0013-0010`'s verify text also names the two clauses: a catalog that moves
   an assigned spec id to another capability, by its `Spec` cell or by its row
   order, is reported; and the skill requires a Change Request to reorder the
   mapping.
2. `TDD-0010` keeps its status, `DR-ID`, `Test file` and `Selector`, and takes
   the `Boundary` `no-argument-targets-every-capability`. Its clause did not
   change, so its obligation did not move.
3. `/qfai-sdd` Phase 2b seeds two `Integration` rows on `TC-0013-0010` at
   `todo`, with this record in `DR-ID`, `BR-Ref` `BR-0013-0007`, and `Test file`
   and `Selector` `-`: `TDD-0110` (`assigned-id-keeps-its-spec`) and `TDD-0111`
   (`reorder-needs-change-request`).

## Options (at least 3) and recommendation

| #   | Option                                                                                               | Cost                                           | Risk                                                                                                                                   | Recommended |
| --- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Widen `TC-0013-0010`'s verify text to the two clauses, and seed one row per clause beside `TDD-0010` | One verify text, two rows                      | None found. No criterion, rule, example or product code changes                                                                        | ✅          |
| 2   | Add a new test case on `AC-0013-0027` for the two clauses, with its own example and rows             | One test case, one example, two rows           | Adds a case and an example that restate what `EX-0013-0005` and `BR-0013-0007` already say, so the criterion is verified in two places |             |
| 3   | Option 1, and also reset `TDD-0010` to `todo` so all three rows are handed over together             | Option 1, plus a handover for an unchanged row | Goes past the request. `TDD-0010`'s clause is unchanged, and resetting it reopens work nobody asked for                                |             |
| 4   | Leave the case as it is                                                                              | None                                           | Two clauses of the criterion stay unverified, and a test can pass while the mapping moves                                              |             |

## Blocked downstream items

None. `TDD-0010` keeps its status, and the two new rows start at `todo`.

- Not blocked by this CR: every other `spec-0013` row.
- Overlapping open CRs: none name `TC-0013-0010` or `TDD-0010`.

## Impact scope

- Specs: `spec-0013`
- Plans: `none`
- Tests: `packages/qfai/tests/integration/sddSkillSpec0013.test.ts` gains the
  two cases, written by `/qfai-atdd`
- Contracts: `none`
- Schema: `none`
- Reviewed unchanged: `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `04_Business-Rules.md` and `05_Examples.md`. `AC-0013-0027`, `BR-0013-0007`
  and `EX-0013-0005` already state the clauses.
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`

## Decision needed from user

Approve option 1: widen `TC-0013-0010` to the two unverified clauses of
`AC-0013-0027` and seed one row for each?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013`, mode `re-derive`, makes steps 1 to 3 of
   `## Proposed change` and records this request in `09_delta.md`.
2. Downstream ledger sweep: no row is reset or retired. `TDD-0010` gains its
   `Boundary` only. `TDD-0110` and `TDD-0111` are seeded.
3. `/qfai-atdd spec-0013` writes the two tests and hands `TDD-0110` and
   `TDD-0111` over.
4. `/qfai-implement spec-0013` takes each of the two rows through its lifecycle.

## Resolution

Applied under option 1.

- `TC-0013-0010`'s verify text names all three clauses of `AC-0013-0027`.
- `TDD-0010` carries the `Boundary` `no-argument-targets-every-capability` and
  is otherwise unchanged.
- `TDD-0110` and `TDD-0111` are seeded at `todo` with this record in `DR-ID`.
- `spec-0013/09_delta.md` records this request.
