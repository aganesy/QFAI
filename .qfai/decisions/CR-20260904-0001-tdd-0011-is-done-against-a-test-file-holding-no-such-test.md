# Change Request

- ID: `CR-20260904-0001`
- Title: `TDD-0011 is done against a test file that holds no QFAI-PROT-002 test`
- Raised by: `claude-code (issue #1079 implementation)`
- Raised at: `2026-09-04T04:40:00Z`
- Class: `traceability`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-04T05:20:00Z`
- Approved option: `1`
- Applied at: `2026-09-04T05:30:00Z`
- Superseded by: `-`

## Context

`.qfai/specs/spec-0004/tdd/test-list.md:15` carries `TDD-0011` at status `done`:

| cell        | value                                                           |
| ----------- | --------------------------------------------------------------- |
| `TC-Ref`    | `TC-0004-0011`                                                  |
| `Test file` | `packages/qfai/tests/core/prototypingEvidence.negative.test.ts` |
| `Selector`  | `QFAI-PROT-002 schema-v3`                                       |
| `Status`    | `done`                                                          |

That test file contains **zero** `QFAI-PROT-002` assertions. Its contents are
`TC-0012-0238..0248` — a different spec's negative-case meta-tests. So the
`REQ -> Spec -> Code -> Test` chain `CLAUDE.md` requires does not close for
`TC-0004-0011`, while the ledger states that it does.

Issue #1079 originally framed this as a released obligation for a gate that was
never built, and proposed either retiring the obligation or building a
`review.json` version discriminator. **Both readings were wrong**, and the
issue carries a correction:

- `schema v3` **is** defined upstream — `03_Acceptance-Criteria.md:48` and
  `04_Business-Rules.md:60` both enumerate it (4 UX axes on the
  `{weak, acceptable, strong, exceptional}` ordinal scale, prose critique
  200..500 words, `pivotDirective` enum, `layoutAntiPatternsDetected`,
  `designMdViolations`). The original grep was scoped to the hyphenated
  `schema-v3` and missed the spaced form, which is where the definition lives.
- `AC-0004-0011` **ships**. The reviewer-deliverable gate enforces every clause,
  covered by roughly thirty `QFAI-PROT-002` cases in
  `packages/qfai/tests/validators/prototypingEvidence.test.ts`.
- `TC-0004-0011`'s wording "feed v1.x-shaped `review.json` to validator" is
  **not** a version check. Its own example, `EX-0004-0010`, defines the input as
  a payload carrying the old keys (`mode`, `fullHarness`,
  `allReviewerAxesPerfect100`) and lacking `pivotDirective`, with the expected
  output "listing missing required keys". No version field is implied, so
  nothing here conflicts with `.agents/rules/distributed-surface.md`.

What remains is narrower and real:

1. the `Test file` cell names the wrong file;
2. no single test feeds `EX-0004-0010`'s payload. The behaviour is covered
   compositionally — the unknown-top-level-key check rejects the three legacy
   keys, and the schema checks reject each missing required key — but no input
   exercises that example as one payload, so no selector resolves for this row
   even after the pointer is corrected.

## Why this needs a Change Request

`constitution/drift-protocol.md#allowed-exceptions` makes `tdd/test-list.md`'s
`Test file` cell writable **only while its seeded value is empty or a dash
placeholder**, and says so one-way: "once the condition that authorised the
write has ceased to hold — a `Test file` that names a path ... rewriting it is
no longer covered". `TDD-0011`'s cell names a path, so the exception has lapsed
and repointing it is drift in the full sense.

The `Selector` cell is separately within the exception, since its seeded value
`QFAI-PROT-002 schema-v3` does not resolve against the named file. Repointing
the file is the part that is not covered, and it is the part that matters.

## Blocked downstream items

| Item       | Kind         | Why it depends on the artifact                               |
| ---------- | ------------ | ------------------------------------------------------------ |
| `TDD-0011` | `ledger-row` | Its `Test file` / `Selector` cells are what this CR corrects |

- Not blocked by this CR: every other `spec-0004` ledger row. No other row names
  `TC-0004-0011`, and none names
  `packages/qfai/tests/core/prototypingEvidence.negative.test.ts`.
- Not blocked: `packages/qfai/tests/validators/prototypingEvidence.test.ts` is
  not named on a `done` row of any **other** spec's ledger, so appending a case
  to it is not a cross-spec ownership event under
  `skills/qfai-implement/references/cross-spec-ownership.md`.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0004` (`tdd/test-list.md` only)
- Plans: `-`
- Tests: `packages/qfai/tests/validators/prototypingEvidence.test.ts` (one case
  added), `packages/qfai/tests/core/prototypingEvidence.negative.test.ts`
  (unchanged; it simply stops being cited)
- Contracts: `-`
- Schema: `-`

## Decision needed from user

`TDD-0011` is `done` against a file with no matching test. Correct the pointer
and add the one test that makes `done` true, correct the pointer only, or record
the discrepancy in `09_delta.md` and leave the row?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd 0004` rerun scope: **`confirm-only`**. Nothing upstream of
   `tdd/test-list.md` changes — `03`, `04`, `05` and `06` are all correct — so
   there is no derivation to re-run. The mode is the one
   `constitution/drift-protocol.md#when-drift-is-detected` step 4 provides for a
   change already applied by hand under approval.
2. Downstream ledger sweep: no reset. `TDD-0011` keeps `Status: done`, which
   becomes true rather than being asserted; its `DR-ID` column records this CR's
   ID.
   - `TDD-0011`

## Resolution

Applied by hand under the approval above, `confirm-only`:

- `tdd/test-list.md` — `TDD-0011`'s `Test file` repointed to
  `packages/qfai/tests/validators/prototypingEvidence.test.ts`, its `Selector`
  set to the name of the added case, and its `DR-ID` set to `CR-20260904-0001`.
- `packages/qfai/tests/validators/prototypingEvidence.test.ts` — one case added
  that feeds `EX-0004-0010`'s payload verbatim and asserts `QFAI-PROT-002`
  naming each missing required key.
- No upstream artifact is edited: `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md` and `06_Test-Cases.md` are all
  correct as written, and the "v1.x-shaped" wording is left alone because
  `EX-0004-0010` already defines it.
