# Change Request

- ID: `CR-20260925-0012`
- Title: `The capture response case never answers status 400`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-25T04:30:30Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-25T04:31:00Z`
- Approved option: `1`
- Applied at: `2026-09-25T04:32:00Z` — see Resolution
- Superseded by: `-`

## Context

`BR-0012-0066` says the default capture runner refuses a navigation that
answers "HTTP 400 or above". `defaultCaptureScreen` implements that as
`status >= 400`.

`TC-0012-0487` verifies the rule with the statuses 200, 204 and 399, which are
captured, and 404 and 500, which are refused. None of them is 400, so the case
cannot tell `status >= 400` from `status > 400`. The rule's own boundary value is
the one status the case leaves out.

The case's row is `TDD-0517`, boundary `status-400-or-above-rejected`. It is at
`refactor` and no review has run on it.

## Reproduction

`status >= 400` replaced by `status > 400` at `defaultCaptureScreen.ts:122`,
then, from the repository root at `05095be04`:

```text
$ pnpm -C packages/qfai exec vitest run tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

The file was restored with `git checkout` afterwards.

## Proposed change

Option 1, as `/qfai-sdd spec-0012`.

1. `TC-0012-0487`'s verify text names 400 among the refused statuses: "one
   answering 400, 404 or 500 fails with a reason naming the status".
2. `TDD-0517` keeps its `TDD-ID`, case, `Tier`, `BR-Ref` and `Boundary`. Its
   obligation moved, so its `Selector` becomes `-`, for `/qfai-implement` to
   fill with the tests of the widened case.

## Options (at least 3) and recommendation

| #   | Option                                                                      | Cost                            | Risk                                                                                         | Recommended |
| --- | --------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| 1   | Add 400 to the refused statuses of `TC-0012-0487`, on `TDD-0517`'s boundary | One verify text, one row reset  | None found. No rule, example or product code changes                                         | ✅          |
| 2   | Seed a new row for status 400 beside `TDD-0517`                             | One verify text, one row seeded | 400 and 404 are refused by the same `status >= 400`, so the new row would split one boundary |             |
| 3   | Leave the case as it is and record the gap                                  | None                            | `status > 400` stays undetected, and the rule's boundary value stays untested                |             |

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                          |
| -------------------- | ------------ | ------------------------------------------------------- |
| `spec-0012/TDD-0517` | `ledger-row` | Its case gains status 400, so its recorded proof is old |

- Not blocked by this CR: `TDD-0582`, the other row on `TC-0012-0487`. Its
  missing-response clause does not change.
- Overlapping open CRs: none name `TC-0012-0487` or `TDD-0517`.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none` here; `/qfai-implement` adds the status-400 test to
  `packages/qfai/tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts`
- Contracts: `none`
- Schema: `none`
- Reviewed unchanged: `.qfai/specs/spec-0012/04_Business-Rules.md` and
  `05_Examples.md`. `BR-0012-0066` already says 400 or above.
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`

## Decision needed from user

Approve option 1: add status 400 to the refused statuses of `TC-0012-0487`, and
reset `TDD-0517` to take it?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`, makes steps 1 and 2 of
   `## Proposed change` and records this request in `09_delta.md`.
2. Downstream ledger sweep: reset to `todo`, recording this CR's ID in their
   `DR-ID` column: `spec-0012/TDD-0517`. No row is retired.
3. `/qfai-implement spec-0012` adds a test whose response answers 400 and is
   refused, and takes `TDD-0517` through a fresh round.

## Resolution

Applied under option 1.

- `TC-0012-0487`'s verify text names 400 among the refused statuses.
- `spec-0012/TDD-0517` keeps its identity and boundary, with `Selector` `-`.
  `/qfai-implement`'s Change Request preflight writes the reset to `todo` and
  this record in `DR-ID`.
- No row is retired.
- `spec-0012/09_delta.md` records this request.
