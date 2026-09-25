# Change Request

- ID: `CR-20260925-0030`
- Title: `No test case requires a refused capture URL to name its screen and exit 2`
- Raised by: `requirements-analyst`
- Raised at: `2026-09-25T10:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to open a first-pass change for every issue without asking; NOT a user decision on these options
- Approved at: `2026-09-25T10:01:00Z`
- Approved option: `1`
- Applied at: `2026-09-25T10:05:00Z` — see Resolution
- Superseded by: `-`

## Context

`BR-0012-0066` and `EX-0012-0187` state one outcome for a capture URL that
cannot be composed: iterate refuses the screen with a reason naming the screen
and `--target-url`, and exits 2. The rule names two such URLs:

1. a route-relative screen URL with no `--target-url`;
2. a screen URL and `--target-url` that do not compose into a URL.

No test case carries that outcome.

- `TC-0012-0486` is a unit case on `composeCaptureUrl`. That function never sees
  the screen id or the exit code.
- A test in `prototypingIterate.cliCapture.test.ts` runs the first URL and
  checks exit 2 and `--target-url`. It does not check that the reason names the
  screen, and no case owns it.
- No test runs iterate on the second URL.

## Proposed change

Option 1.

1. Add `TC-0012-0495`, an integration case on `EX-0012-0187` and
   `AC-0012-0059`. It verifies that, on either URL, iterate exits 2 with a
   reason on stderr naming the screen and `--target-url`, and captures nothing.
2. `/qfai-sdd` Phase 2b seeds one `Integration` row per URL on `TC-0012-0495`
   at `todo`, with this record in `DR-ID` and `BR-Ref` `BR-0012-0066`:
   `TDD-0585` (`route-relative-without-target-names-screen-exits-2`) and
   `TDD-0586` (`uncomposable-pair-names-screen-exits-2`).

## Options (at least 3) and recommendation

| #   | Option                                                           | Cost                      | Risk                                                                                                   | Recommended |
| --- | ---------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ | ----------- |
| 1   | Add one integration case for both URLs, and seed one row per URL | One test case, two rows   | None found. No criterion, rule, example or product code changes                                        | ✅          |
| 2   | Widen `TC-0012-0486` to the screen id and the exit code          | One verify text           | The case is a unit case on a function that sees neither, so no test at its layer can verify the clause |             |
| 3   | Widen `TC-0012-0484`, the integration case on the same test file | One verify text, two rows | That case hangs from `EX-0012-0168`, the flag and the default runner, not from the composition example |             |
| 4   | Leave the cases as they are                                      | None                      | Iterate can drop the screen from the reason, or exit 0 on an uncomposable pair, and every test passes  |             |

## Blocked downstream items

None. The two new rows start at `todo`.

- Not blocked by this CR: every other `spec-0012` row.
- Overlapping open CRs: none name `TC-0012-0495`, `TDD-0585` or `TDD-0586`.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: a new file,
  `packages/qfai/tests/integration/cli/commands/prototypingIterate.captureUrlRefused.test.ts`,
  holds one test per URL. The route-relative test in
  `prototypingIterate.cliCapture.test.ts` stays as it is: completed rows record
  that file's hash, and editing it would invalidate their evidence
- Contracts: `none`
- Schema: `none`
- Reviewed unchanged: `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`,
  `04_Business-Rules.md` and `05_Examples.md`. `BR-0012-0066` and
  `EX-0012-0187` already state the outcome.
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`

## Decision needed from user

Approve option 1: add one integration case for the refused capture URL and seed
one row per URL?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`, makes steps 1 and 2 of
   `## Proposed change` and records this request in `09_delta.md`.
2. Downstream ledger sweep: no row is reset or retired. `TDD-0585` and
   `TDD-0586` are seeded.
3. `/qfai-atdd spec-0012` hands `TDD-0585` and `TDD-0586` over.
4. `/qfai-implement spec-0012` takes each of the two rows through its lifecycle.

## Resolution

Applied under option 1.

- `TC-0012-0495` is added on `EX-0012-0187`.
- `TDD-0585` and `TDD-0586` are seeded at `todo` with this record in `DR-ID`.
- `spec-0012/09_delta.md` records this request.
