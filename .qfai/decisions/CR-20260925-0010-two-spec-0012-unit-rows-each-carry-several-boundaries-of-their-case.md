# Change Request

- ID: `CR-20260925-0010`
- Title: `Two spec-0012 unit rows each carry several boundaries of their case`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-25T03:36:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-25T03:36:30Z`
- Approved option: `1`
- Applied at: `2026-09-25T03:37:10Z` — see Resolution
- Superseded by: `-`

## Context

`TDD-0516` and `TDD-0517` are the `unit` rows on `TC-0012-0486` and
`TC-0012-0487`. Both cases declare `Level: L1`, so `/qfai-implement` writes and
runs their tests. Its run started 2026-09-23T22:29:18.879Z selected both rows
and stopped them at `todo`, before any edit: each case states more than one
boundary, and `qfai-implement/references/selector-granularity.md` allows one per
row. A split is `/qfai-sdd` Phase 2b's write.

Both rows still name a description rather than a test in `Selector`, so neither
resolves to a test in its file.

### `TDD-0516` on `TC-0012-0486`

`composeCaptureUrl` in `packages/qfai/src/cli/commands/prototypingIterate.ts`
decides each boundary on its own predicate.

| Boundary the case states                                                           | Predicate                                           |
| ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| An `http://` or `https://` screen URL is opened as written                         | `/^https?:\/\//i.test(screenUrl)`                   |
| A route-relative URL, with or without a leading slash, is joined to `--target-url` | `new URL(screenUrl, targetUrl)`                     |
| A screen with no URL falls back to `--target-url`, or to none                      | `screenUrl === undefined`                           |
| A route-relative URL with no `--target-url` fails with a reason naming the flag    | `targetUrl === undefined`, and its `reason`         |
| A pair that does not compose fails with a reason naming the flag                   | the `catch` around `new URL(...)`, and its `reason` |

The last two are two rejection reasons, so they are two boundaries.

### `TDD-0517` on `TC-0012-0487`

`defaultCaptureScreen` in `packages/qfai/src/core/prototyping/defaultCaptureScreen.ts`
refuses a navigation on two predicates, each with its own reason.

| Boundary the case states                                                            | Predicate           |
| ----------------------------------------------------------------------------------- | ------------------- |
| A status of 400 or above fails with a reason naming the status, and is not captured | `status >= 400`     |
| A navigation that returns no response fails with `no response`, and is not captured | `response === null` |

The statuses 200, 204 and 399 that are captured, and 404 and 500 that are not,
are the two sides of the first boundary.

### The route-relative tests do not observe the join

Both route-relative tests use a base where joining and concatenating give the
same string. Only the unparseable-pair test fails when the join is replaced by
concatenation.

## Reproduction

`new URL(screenUrl, targetUrl).toString()` replaced by `targetUrl + screenUrl`
at `prototypingIterate.ts:1804`, then, from the repository root at
`9d14e814c`:

```text
$ pnpm -C packages/qfai exec vitest run tests/unit/cli/commands/prototypingIterate.composeCaptureUrl.test.ts
     × returns ok=false with the operator-facing flag named when URL composition throws 4ms
 Test Files  1 failed (1)
      Tests  1 failed | 7 passed (8)
```

The file was restored with `git checkout` afterwards.

## Proposed change

Option 1, as `/qfai-sdd spec-0012` Phase 2b's write.

1. Each row keeps its case and the first boundary above. Its `Selector` becomes
   `-`, for `/qfai-implement` to fill with the tests that observe the boundary.
   It takes this record in `DR-ID` beside `CR-20260923-0001`, and its `Tier`,
   `BR-Ref` and `Boundary`:
   - `TDD-0516`: `T1`, `BR-0012-0066`, `absolute-url-opened-as-written`;
   - `TDD-0517`: `T2`, `BR-0012-0066`, `status-400-or-above-rejected`.
2. Five `Unit` rows are seeded at `todo`, with this record in `DR-ID`, the case's
   test file in `Test file`, `Selector` `-`, and `BR-Ref` `BR-0012-0066`, which
   `EX-0012-0187` and `EX-0012-0188` name:

   | Row        | Case           | Tier | Boundary                                         |
   | ---------- | -------------- | ---- | ------------------------------------------------ |
   | `TDD-0578` | `TC-0012-0486` | `T1` | `route-relative-url-joined-to-target-url`        |
   | `TDD-0579` | `TC-0012-0486` | `T1` | `no-screen-url-falls-back-to-target-url`         |
   | `TDD-0580` | `TC-0012-0486` | `T1` | `route-relative-url-without-target-url-rejected` |
   | `TDD-0581` | `TC-0012-0486` | `T1` | `uncomposable-pair-rejected`                     |
   | `TDD-0582` | `TC-0012-0487` | `T2` | `no-response-rejected`                           |

3. The tier follows `qfai-implement/references/volume-policy.md`.
   `composeCaptureUrl` is decision logic that touches no infrastructure, and the
   package does not export it. `defaultCaptureScreen` drives the Playwright
   browser and writes the capture files, so its rows touch infrastructure.
4. No test case is restated. `TC-0012-0486` already says a route-relative URL is
   joined by `new URL(route, base)`, and `TC-0012-0487` already names each
   status and both reasons. Every clause of the two cases maps to one row above.

## Options (at least 3) and recommendation

| #   | Option                                                                                         | Cost                                      | Risk                                                                                                     | Recommended |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Split each row into one row per boundary its case states                                       | Five rows seeded, two rows re-scoped      | None found. No case, rule or product code changes                                                        | ✅          |
| 2   | As option 1, but one row per status in `TDD-0517`'s first boundary                             | Nine rows seeded, two rows re-scoped      | 200, 204 and 399 share one predicate with 404 and 500, so each row's proof would break the same `>= 400` |             |
| 3   | Split `TC-0012-0486` and `TC-0012-0487` into one test case per boundary, each with its own row | Seven cases restated or added, seven rows | Restates two cases whose text already names every boundary, for a split the ledger alone can carry       |             |

## Blocked downstream items

None. Both rows are at `todo` and stay there, and the five new rows start at
`todo`.

- Not blocked by this CR: every other `spec-0012` row. `TDD-0514`, `TDD-0568`
  and `TDD-0569` read the same two modules through iterate, and none of them
  changes.
- Overlapping open CRs: none name `TC-0012-0486`, `TC-0012-0487`, `TDD-0516` or
  `TDD-0517`.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none` here; `/qfai-implement` writes the tests of the seven rows in
  `packages/qfai/tests/unit/cli/commands/prototypingIterate.composeCaptureUrl.test.ts`
  and `packages/qfai/tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts`
- Contracts: `none`
- Schema: `none`
- Reviewed unchanged: `.qfai/specs/spec-0012/04_Business-Rules.md`,
  `05_Examples.md` and `06_Test-Cases.md`. `BR-0012-0066`, `EX-0012-0187`,
  `EX-0012-0188`, `TC-0012-0486` and `TC-0012-0487` already state every
  boundary.
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0012/tdd/test-list.md`,
  `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve option 1: split `TDD-0516` into five rows and `TDD-0517` into two, one
per boundary their cases state?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`, makes the ledger edits in steps 1
   and 2 of `## Proposed change` and records this request in `09_delta.md`.
2. Downstream ledger sweep: reset to `todo`, recording this CR's ID in their
   `DR-ID` column: `spec-0012/TDD-0516`, `spec-0012/TDD-0517`. Both are already
   at `todo`, so the reset writes only `DR-ID`. No row is retired.
3. `/qfai-implement spec-0012` takes `TDD-0516`, `TDD-0578` to `TDD-0581`,
   `TDD-0517` and `TDD-0582` through their cycle. The test of `TDD-0578` must
   fail when the join is replaced by concatenation.

## Resolution

Applied under option 1.

- `spec-0012/TDD-0516` and `spec-0012/TDD-0517` name their first boundary
  alone, with `Selector` `-`, their `Tier`, `BR-Ref` and `Boundary`, and
  this record in `DR-ID` beside `CR-20260923-0001`. Both stay at `todo`.
- `TDD-0578` to `TDD-0581` are seeded on `TC-0012-0486`, and `TDD-0582` on
  `TC-0012-0487`, in the order of the table in step 2, at `todo`, with this
  record in `DR-ID`.
- No row is retired.
- `spec-0012/09_delta.md` records this request.
