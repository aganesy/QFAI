# Change Request

- ID: `CR-20260904-0001`
- Title: `TDD-0011 is done against a test file that holds no QFAI-PROT-002 test`
- Raised by: `claude-code (issue #1079 implementation)`
- Raised at: `2026-09-04T05:09:48+09:00`
- Class: `traceability`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-04T05:20:00+09:00`
- Approved option: `1`
- Scope extended at: `2026-09-04T05:41:13+09:00` (approved by `yusuke_senaga` before
  that commit) — see
  **Scope extension** below
- Applied at: `2026-09-04T12:35:00+09:00` — the `confirm-only` rerun's output written
  to `.qfai/specs/spec-0004/09_delta.md`; see **Timestamps**
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

- Not blocked by this CR: every other `spec-0004` ledger row **except**
  `TDD-0012` and `TDD-0013`. The original wording of this bullet claimed no
  other row named
  `packages/qfai/tests/core/prototypingEvidence.negative.test.ts`; that was
  wrong, and both of those rows do. See **Scope extension**.
- Not blocked: `packages/qfai/tests/validators/prototypingEvidence.test.ts` is
  not named on a `done` row of any **other** spec's ledger, so appending a case
  to it is not a cross-spec ownership event under
  `skills/qfai-implement/references/cross-spec-ownership.md`.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0004` — `tdd/test-list.md` (the repointed rows),
  `16_Traceability-ledger.md` (`REQ-0020`) and `09_delta.md` (the `confirm-only`
  rerun's CR reference)
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
   `tdd/test-list.md` changes, so there is no derivation to re-run. The mode
   confirms that the corrected rows describe tests that exist; it does **not**
   certify the rest of the pack, and three schema divergences found while
   recording this CR are tracked in #1105 rather than resolved here. Per `constitution/drift-protocol.md`
   step 4, that rerun's output is the CR reference recorded in the spec's delta
   log — see `.qfai/specs/spec-0004/09_delta.md`, entry `2026-09-04`. The mode is the one
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
- `.qfai/specs/spec-0004/09_delta.md` — the `2026-09-04` entry recording this CR,
  its mode and its invocation, which is the `confirm-only` rerun's output.
- No DERIVED upstream artifact is edited. `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md` and `06_Test-Cases.md` are correct
  **on the point this CR is about** — the obligation exists, is implemented, and
  the defect was which file the ledger cited. They are **not** correct
  throughout: #1105 records three divergences between this pack's `review.json`
  schema and the shipped validator, found while recording this CR. An earlier
  revision of this CR called `03`-`06` "all correct as written", which was wrong
  and is withdrawn. The "v1.x-shaped" wording is left alone because
  `EX-0004-0010` already defines it.

## Scope extension

Approved separately, 2026-09-04, after `TDD-0011` was corrected and the
neighbouring rows were checked: `TDD-0012`, `TDD-0013` and `REQ-0020` carry the
identical defect. All three cite
`packages/qfai/tests/core/prototypingEvidence.negative.test.ts`, which holds
**zero** `QFAI-PROT-002` assertions; the two ledger rows sit at `done`.

Both behaviours already exist in
`packages/qfai/tests/validators/prototypingEvidence.test.ts`, so **no test is
added** — this extension is three pointers:

| item       | TC             | repointed to (existing test)                                             |
| ---------- | -------------- | ------------------------------------------------------------------------ |
| `TDD-0012` | `TC-0004-0012` | `emits QFAI-PROT-002 for a lap-* code no registry entry declares`        |
| `TDD-0013` | `TC-0004-0013` | `emits QFAI-PROT-002 when designMdViolations contains a malformed entry` |
| `REQ-0020` | —              | `16_Traceability-ledger.md`'s test column, same file swap                |

`TDD-0012`'s `Selector` is wrapped in backticks. Prettier escapes a bare `*` in
markdown table text to `\*`, which breaks verbatim containment — the row would
then resolve only through `selectorResolves`' last-identifier fallback, on the
word "declares", which is the kind of accidental pass this CR exists to remove.
`normalizeSelector` strips surrounding backticks ("quotes off"), so the wrapped
form resolves verbatim. Verified: all three selectors are contained verbatim in
the file their row now names, under the strict predicate rather than the
fallback.

Both rows keep `Status: done` and take `DR-ID: CR-20260904-0001`.

## Timestamps

All times above are **JST (`+09:00`)**, which is this repository's local zone and
the zone the CR ID's date is taken from. They were first written as a JST wall
clock stamped with `Z`, which puts every value **nine hours later** than the
instant it names: `2026-09-04T05:20:00+09:00` is `2026-09-03T20:20:00Z`, so
writing `2026-09-04T05:20:00Z` describes an event nine hours after the real one.
On `CR-20260904-0002` that was late enough to record a scope extension as
approved _after_ the commit that applied it. Raised by Codex on PR #1092, which
also caught an earlier revision of this paragraph describing the shift in the
wrong direction.

Each value is anchored to something checkable rather than estimated:

| field               | value                       | anchor                                                                                                                                          |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Raised at`         | `2026-09-04T05:09:48+09:00` | the correction comment on issue #1079                                                                                                           |
| `Applied at`        | `2026-09-04T12:35:00+09:00` | the `confirm-only` rerun's CR reference written to `spec-0004/09_delta.md`; the ledger corrections landed earlier, at `05:32:10` and `05:41:13` |
| `Scope extended at` | `2026-09-04T05:41:13+09:00` | commit `a6848f11` author time                                                                                                                   |

`Approved at` is the only estimate. The approval is a conversation turn and
leaves no artifact, so it is bounded below by `Raised at` and above by
`Applied at`, and the value sits inside that interval. It is not a logged
instant and should not be read as one.

### What moves `Applied at`, and what does not

`Applied at` is when the owner-skill rerun completed and the upstream artifacts
carried the approved change — `skills/qfai-sdd/templates/change-request.md:20`.

Commits after that point corrected **defects in the applied text**: wording that
misstated `certify`'s branch order, a table disagreeing with its header, a
sentence broken by a line-index edit. Those are repairs to the application, not
new applications, and they do not move `Applied at`. What would move it is a
further approved change to an upstream artifact — there has been none.

Recorded because the field was re-pointed four times during review, each time
chasing the newest commit, which is the wrong rule.
