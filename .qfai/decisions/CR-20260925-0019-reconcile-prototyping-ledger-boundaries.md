# Change Request

- ID: `CR-20260925-0019`
- Title: `Reconcile duplicate and stale prototyping ledger boundaries`
- Raised by: `qfai-implement test-design analyst`
- Raised at: `2026-09-24T19:08:05Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — explicit Option 1 selection relayed by the orchestrator
- Approved at: `2026-09-24T21:19:12Z` (recorded at; reply timestamp unavailable)
- Approved option: `1 — reconcile active boundaries and retire orphaned rows`
- Applied at: `2026-09-24T23:35:15Z`
- Superseded by: `-`

## Identifier

This record was raised as `CR-20260925-0005`. The main branch gives that ID to another
record, so this one is `CR-20260925-0019`.

## Context

`npx qfai validate --profile sdd --spec spec-0012` reports eight
`QFAI-TDDLIST-017` errors: each test case below has two ledger rows, both
without a `Boundary`. A distinct slug cannot be inferred from the row count.
The older rows mix several test cases or point to one selector, while the later
rows often point to that same selector. Every listed row is `done`.

| Test case      | Rows                   | Recorded relationship and conflict                                                                                                                                                                                                                                                        |
| -------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-0012-0319` | `TDD-0336`, `TDD-0363` | Both name the same converged selector. `TDD-0336` also names three other cases and three selectors.                                                                                                                                                                                       |
| `TC-0012-0320` | `TDD-0336`, `TDD-0364` | Both name the same nonempty layout-antipattern selector. The case specifies `lap-007-state-not-represented`, but the test uses `lap-008`.                                                                                                                                                 |
| `TC-0012-0321` | `TDD-0336`, `TDD-0365` | The case is explicitly superseded by `TC-0012-0357` under the ten-cycle budget. `TDD-0336` names no index-14 selector, and `TDD-0365` points to an absent case-ID selector. `TDD-0372` already owns the index-9 successor.                                                                |
| `TC-0012-0322` | `TDD-0337`, `TDD-0366` | Both select the cycle-0 happy path. `TDD-0337` also claims exit-code cases `0323` to `0325`, although its selector names only `0322`; `0325` is superseded by `TC-0012-0358`, owned by `TDD-0373`.                                                                                        |
| `TC-0012-0327` | `TDD-0338`, `TDD-0367` | Both select the same hash-mismatch exit-2 test. `TDD-0338` also claims hash recording case `0326` without a matching selector.                                                                                                                                                            |
| `TC-0012-0328` | `TDD-0339`, `TDD-0368` | Both name the same determinism and purity selector; the case declares no second independently observable boundary.                                                                                                                                                                        |
| `TC-0012-0334` | `TDD-0343`, `TDD-0369` | Both name the same certificate save/load selector. The test checks object equality only. Its AC, EX and the EX's BR are superseded; active certify coverage does not state a v2 byte-round-trip requirement.                                                                              |
| `TC-0012-0335` | `TDD-0344`, `TDD-0370` | Both use a case-ID selector, and neither resolves to a case-annotated test in their named `certificate.test.ts`. Their `Unit` layer cannot prove the post-handoff output file was generated. The separate divergent-value validator test under `TC-0012-0346` does not prove that output. |

`spec-0012/09_delta.md` already records the fifteen-to-ten-cycle change, and
`TC-0012-0321` / `TC-0012-0325` mark themselves superseded. This request
does not reverse that decision. Filling `Boundary` with arbitrary labels would
make the validator pass while preserving duplicate claims and absent or stale
tests. A passed historical test is evidence only for the assertion it ran,
not for every case named in its ledger row.

`TC-0012-0334` cites superseded `AC-0012-0033` and `EX-0012-0110`;
the example's `BR-0012-0024` is superseded too. The active
`AC-0012-0047` and `BR-0012-0036` require per-spec review-file presence
and missing-pair diagnostics, not v2 parse-then-serialize byte equality.
The existing `TDD-0343` test asserts loaded object equality only. The
loader normalizes fields and the writer canonicalizes key order and
whitespace, so arbitrary valid input bytes are not preserved. Under the
recommended option, this orphaned case leaves active coverage, and its
two rows are retired. Its history remains in `09_delta.md`. Merely adding
a `Status: superseded` note would not remove it from validator coverage:
the same note on `TC-0012-0321` leaves that case in the duplicate-row
error set.

`TC-0012-0335` still requires token equality in the file produced after
handoff. Its source is the `/qfai-prototyping` handoff Step H, while
`certificate.test.ts` exercises certificate helpers. The
`design-system.yaml` mirror also carries source and hash metadata, so
whole-file comparison with root `DESIGN.md` would be a false oracle.
Compare the complete declared token key set and each token's exact
serialized value for color, typography, radius and shadow, including
missing and extra keys. This requires running the real handoff writer
and reading its output, rather than pre-seeding a mirror fixture.
`TC-0012-0335` is currently `Level: L1`; its observable post-handoff
file boundary needs `L3` and an `Integration` row. The active
`US-0012-0108` already has an independent `E2E` seed, `TDD-0545`.

The two related open requests have different decisions. `CR-20260912-0003`
identifies `TDD-0336` to `TDD-0338` as multi-case legacy rows, but expressly
requires a separate request naming their boundaries and order before a split.
`CR-20260913-0002` concerns the prototyping evidence layout and says its
possible `spec-0012` rerun cannot split, reset or retire these older rows
without a request of their own. Neither is approved or applied, and neither
authorizes this ledger repair. This request leaves the design-direction,
evidence-layout, aggregate-mirror and `TDD-0384` choices to those requests.
If either older request is applied first and changes this request's
`spec-0012` baseline, re-read the affected cases and ledger rows and
restate this request for review where its exact reset, retirement or
impact scope changed; do not apply it against the earlier snapshot.

## Proposed change

Choose how to reconcile the eight duplicate case mappings. The recommended
option removes orphaned `TC-0012-0334` from active coverage, retires its two
ledger rows and records their history in `09_delta.md`. Delete only their
shared test selector; preserve the other active tests in
`certificate.test.ts`. Keep the ten-cycle obligations and give every
surviving row one observable boundary, an independently selectable test and
an honest execution state. Retire a row only with its evidence pointer and
test disposition recorded. This is an owner-phase ledger re-derivation, not
a downstream edit to `Boundary` alone.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                                                                                                                                       | Cost                                                                                                                                                                                                                                         | Risk                                                                                                                                                                                      | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Reconcile active cases against actual selectors. Re-scope the three aggregate rows, remove orphaned `TC-0012-0334` from active coverage and retire both certificate rows, reclassify `TC-0012-0335` as `L3`, retire both false Unit handoff rows, and seed an Integration row over real post-handoff output. | One `/qfai-sdd spec-0012` re-derivation, three upstream resets, six explicit retirements, at least two newly seeded Integration rows, a separate D14/test_fix re-verification for `TDD-0364`, and targeted hash-recording and handoff tests. | Historical `done` credit is withdrawn only on rows whose identity changes. A callable handoff writer or faithful workflow harness must exist before the new Integration row can pass.     | ✅          |
| 2   | Add a new active certificate requirement scoped to canonical v2 JSON input bytes only. Define its schema and canonical encoding in an active `AC`, `BR` and `EX`, re-anchor `TC-0012-0334`, reset `TDD-0343`, and consolidate the other rows as in Option 1.                                                 | Wider SDD re-derivation, four upstream resets, five retirements, the same D14/test_fix re-verification for `TDD-0364`, and a byte-level RED/GREEN test.                                                                                      | Canonical-only scope narrows the old case wording. Preserving arbitrary valid source bytes is outside this option and would require a separate decision and product compatibility change. |             |
| 3   | Retire all fourteen implicated rows and seed new single-boundary rows from the current cases. Re-execute each assertion through the proper owner layer.                                                                                                                                                      | Full ledger and evidence migration across unit and integration rows, fresh TDD IDs and reruns of already valid tests.                                                                                                                        | Loses the identity of valid historical work and expands the review surface substantially.                                                                                                 |             |

Option 1 keeps valid assertions attached to stable IDs while removing only
claims the tests cannot distinguish. Its deterministic boundary order for the
aggregate rows is `TDD-0336`: `TC-0012-0329` design-violation rejection;
`TDD-0337`: `TC-0012-0323` missing-target rejection, then a new row for
`TC-0012-0324` convergence exit 64; `TDD-0338`: `TC-0012-0326` cycle-0 digest
recording. The old index-14 `TC-0012-0321` and exit-65 `TC-0012-0325` do not
gain replacement rows; their active successors already have `TDD-0372` and
`TDD-0373`. For every case with one surviving row, `Boundary` remains `-`.
No case in this set earns two boundary slugs merely because two rows exist.
Under Option 1, no active row or new v2 byte fixture is seeded from
`TC-0012-0334`. Option 2 fixes the byte rule to canonical v2 JSON input:
keys sorted at every object level, the writer's indentation and a final
newline. The loader drops unknown fields and maps a legacy reviewer field
to `reviewerId`, so the canonical fixture must use only the specified
fields and canonical `reviewerId` form. Arbitrary valid source bytes cannot
survive the current parse/write path unchanged; that broader guarantee
requires a separate decision and is outside this request. For
`TC-0012-0335`, the new Integration row
must drive handoff Step H with a controlled `DESIGN.md`, read
the generated `.qfai/contracts/design/design-system.yaml`, and compare the
full required token key set and exact serialized token values in both
directions. It must catch changed, missing and fabricated tokens. It does not
compare the two entire files, because the mirror has metadata that
`DESIGN.md` does not.

## Blocked downstream items

| Item                                                                             | Kind         | Why it depends on the artifact                                                                             |
| -------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| `spec-0012/TDD-0336`, `TDD-0363`, `TDD-0364`, `TDD-0365`                         | `ledger-row` | Their overlapping case refs and shared `iteration.test.ts` selectors must be reconciled together.          |
| `spec-0012/TDD-0337`, `TDD-0366`                                                 | `ledger-row` | Both claim the cycle-0 test, and the aggregate row also claims the other exit-code cases.                  |
| `spec-0012/TDD-0338`, `TDD-0367`                                                 | `ledger-row` | Both claim the hash-mismatch test while hash recording is unassigned to a selector.                        |
| `spec-0012/TDD-0339`, `TDD-0368`                                                 | `ledger-row` | They claim one purity/determinism test twice.                                                              |
| `spec-0012/TDD-0343`, `TDD-0369`                                                 | `ledger-row` | Their case has no active AC or EX parent; Option 1 retires both rows.                                      |
| `spec-0012/TDD-0344`, `TDD-0370`                                                 | `ledger-row` | Their Unit layer cannot establish actual post-handoff file content; both are retired under Option 1.       |
| `spec-0012/TDD-0545`                                                             | `ledger-row` | Its E2E story reads the same generated handoff artifact; it cannot complete against an unresolved writer.  |
| `spec-0012/TC-0012-0319`, `0320`, `0321`, `0322`, `0327`, `0328`, `0334`, `0335` | `spec`       | Their execution mapping is in dispute; the superseded case must not be restored.                           |
| `spec-0012/TC-0012-0323`, `0324`, `0325`, `0326`, `0329`                         | `spec`       | The aggregate rows claim these neighboring cases and the owner sweep must assign their surviving coverage. |

- Not blocked by this request: `spec-0012/TDD-0372` and `TDD-0373` retain the
  active ten-cycle successors. Re-verify them if a shared test or production
  file changes. `TDD-0384` and the evidence-layout obligations remain under
  `CR-20260913-0002`; design-direction obligations remain under
  `CR-20260912-0003`. Other multi-selector legacy rows, including
  `TDD-0342`, require their own audit and are outside this request.
- Overlapping open requests: `CR-20260912-0003` names `TDD-0336` to
  `TDD-0338` as a known legacy shape; `CR-20260913-0002` can require a
  `spec-0012` rerun. The effective halt is the union of their actual blocked
  sets; neither request's separate substantive choice is decided here.
- `TDD-0364` is named for its shared selector and fixture repair only.
  Its unchanged `TC-0012-0320` obligation gives this request no authority
  to reset its `done` status.

## Impact scope

- Specs: `spec-0012`, limited to the case and row mappings named above.
- Plans: `.qfai/specs/spec-0012/10_Plan.md` only if the owner re-derivation
  finds a stale allocation for those mappings.
- Tests: `packages/qfai/tests/core/prototyping/iteration.test.ts`,
  `packages/qfai/tests/core/prototyping/designMdViolations.test.ts`,
  `packages/qfai/tests/core/prototyping/certificate.test.ts`, and
  `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`, plus the
  new `/qfai-atdd` Integration test for the actual post-handoff writer.
- Contracts: none under Option 1. The evidence-layout contract remains with
  `CR-20260913-0002`.
- Schema: none under Option 1. Option 2 must define its v2 certificate
  schema before a byte oracle is written.
- Upstream paths edited under Option 1:
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`,
  `.qfai/specs/spec-0012/09_delta.md`, and
  `.qfai/specs/spec-0012/16_Traceability-ledger.md`; also
  `.qfai/specs/spec-0012/10_Plan.md` only if allocation is stale.
- Additional upstream paths if Option 2 is chosen:
  `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0012/04_Business-Rules.md`,
  `.qfai/specs/spec-0012/05_Examples.md` and, only if needed to state the
  certificate contract, `.qfai/specs/spec-0012/01_Spec.md`. The selected
  option restricts edits within the named paths.

## Decision needed from user

Choose the treatment of the orphaned certificate case and duplicate
completed rows. Option 1 is recommended because it follows the active
per-spec certify obligation without adding a byte guarantee the product
has not promised.

## Approved actions (owner skill rerun plan)

1. After approval, run `/qfai-sdd spec-0012`, mode `re-derive`, for the
   mappings above. Record this request in `spec-0012/09_delta.md`,
   including the former `TC-0012-0334` wording, its superseded
   `AC-0012-0033` and `EX-0012-0110` parents, and the retired row
   identities. Under Option 1, remove `TC-0012-0334` from
   `06_Test-Cases.md` as an active coverage declaration; a superseded
   note alone does not remove it from validation. Do not re-point it to
   `AC-0012-0047`. Re-scope `TDD-0336` to `TC-0012-0329`, `TDD-0337`
   to `TC-0012-0323`, and `TDD-0338` to `TC-0012-0326`, in that order.
   Seed a new Integration row for `TC-0012-0324`. Reclassify
   `TC-0012-0335` from `L1` to `L3`, change its test-file plan from
   `certificate.test.ts` to a real post-handoff Integration test, and
   seed a fresh `Integration` row for it. Use IDs above the highest ever
   issued. Keep `TDD-0363`, `0364`, `0366`, `0367` and `0339` as the
   single-case owners of their respective cases. Leave `TC-0012-0321`
   and `TC-0012-0325` superseded. `TDD-0545` stays the separate E2E
   obligation for `US-0012-0108`.
2. `/qfai-implement spec-0012` Change-Request preflight resets exactly
   `spec-0012/TDD-0336`, `TDD-0337` and `TDD-0338` to `todo`, appends
   this request to their `DR-ID`, and preserves the prior evidence trail
   as withdrawn history. These three rows change identity. No other
   existing row is reset under Option 1. Newly seeded rows begin at
   `todo`.
3. `/qfai-sdd spec-0012` retires exactly these six rows under Option 1:
   - `spec-0012/TDD-0365` — original Evidence: `shouldStop max-iterations at index 14 (additional coverage)` (verbatim). No index-14 test is
     found under its selector; `TDD-0372` owns the active index-9 test.
   - `spec-0012/TDD-0368` — original Evidence: `findDesignMdViolations idempotency (additional coverage)` (verbatim). Keep the shared test
     under `TDD-0339`; delete no test body.
   - `spec-0012/TDD-0343` — original Evidence: `certificate v2.0 round-trip` (verbatim). Delete only the
     `certificate.test.ts` selector
     `writes to canonical path and load returns the same object`; preserve
     every other active test in that shared file.
   - `spec-0012/TDD-0369` — original Evidence: `certificate v2.0 schema validation (additional coverage)` (verbatim). It shared
     `TDD-0343`'s selector; the same one-block deletion disposes of the
     test without deleting another test.
   - `spec-0012/TDD-0344` — original Evidence: `design-system mirrors DESIGN.md tokens` (verbatim). The named
     `certificate.test.ts` contains no case-annotated post-handoff assertion;
     a new Integration row owns the actual generated-output test.
   - `spec-0012/TDD-0370` — original Evidence: `design-system mirror equality (additional coverage)` (verbatim). Its case-ID selector
     names no test; the new Integration row owns the handoff-output assertion.
     The retired IDs are never reused. Do not delete or rewrite a selector
     shared with a surviving row. For **each of these six `done` rows**,
     retain each original Evidence cell verbatim in its tombstone and
     Resolution entry, alongside `retired at Status = done` and the test
     disposition. These descriptive Evidence cells do not establish a
     completed test run or reviewed evidence anchor. Do not assert that a
     row was never executed: the historical execution state is unproved.
4. `spec-0012/TDD-0364` keeps `Status = done`, `TC-Refs` and its evidence
   identity. Its `TC-0012-0320` obligation has not changed; the `lap-008`
   fixture is a D14/test_fix defect against the declared
   `lap-007-state-not-represented` value. Correct that fixture in
   `iteration.test.ts` without an upstream reset. Re-run its exact
   selector on the changed test, record the changed artifact hash and
   result, obtain independent review, and re-verify every completed row
   sharing that test file under the shared-artifact procedure. Do not
   mark the row `todo` or count this as a new obligation.
5. Sweep every `spec-0012` ledger table, including later `CHG-*` tables,
   against the active `TC-*` set and their actual selectors. Give one
   observable boundary to each surviving row. Keep `Boundary = -` for a
   single-row case; seed stable slugs only for a genuine multi-boundary
   case. Preserve unrelated statuses, evidence and selectors. Re-verify the
   unchanged `done` rows `TDD-0363`, `TDD-0366`, `TDD-0367`, `TDD-0339`,
   `TDD-0372` and `TDD-0373` if their shared files are edited. The retired
   Unit rows' evidence does not transfer to the new Integration row.
6. Run the scoped SDD validator and the relevant unit and integration tests.
   `/qfai-atdd spec-0012` owns the new `Integration` tests, including the
   generated-output oracle for `TC-0012-0335`; `/qfai-implement spec-0012`
   executes the reset unit rows and resumes only after the owner rerun and
   ledger sweep. The handoff test must invoke the real writer or a faithful
   workflow harness. If neither exists, leave its row incomplete and raise
   the implementation-surface gap rather than passing a seeded mirror
   fixture.
7. If Option 2 is selected, first run `/qfai-sdd spec-0012`, mode
   `re-derive`, to create active `AC` / `BR` / `EX` text defining the
   v2 schema and a byte rule limited to canonical v2 JSON input.
   Re-anchor `TC-0012-0334` to that
   new chain; do not remove it. Replace Option 1's retirement of
   `spec-0012/TDD-0343` with a reset to `todo` and a byte-level RED
   against canonical input bytes. Retire `spec-0012/TDD-0369` and assign
   its shared selector to the surviving `TDD-0343`. Its tombstone and
   Resolution entry retain its original descriptive Evidence cell, as in
   step 3.
   The other three resets and five retirements remain as in Option 1.
   The active requirement must state the canonical-input restriction.
   Arbitrary-byte preservation requires a separate decision and product
   compatibility design; it is not authorized by this option.
8. If Option 3 is selected, retire exactly `spec-0012/TDD-0336`,
   `TDD-0337`, `TDD-0338`, `TDD-0339`, `TDD-0343`, `TDD-0344`,
   `TDD-0363`, `TDD-0364`, `TDD-0365`, `TDD-0366`, `TDD-0367`,
   `TDD-0368`, `TDD-0369` and `TDD-0370`. Each of these fourteen rows
   is currently `done`. Preserve each row's original Evidence cell
   verbatim in its tombstone and Resolution entry, and describe its
   execution status only as `retired at Status = done`. Re-point each valid
   selector to its newly
   seeded active-case row before deleting the legacy row; delete the
   orphaned certificate selector and any selector that cannot map to
   an active case. Remove `TC-0012-0334` from active coverage and
   record its history as in Option 1. Reclassify `TC-0012-0335` to `L3`
   as in Option 1. Seed new IDs above the historical maximum and execute
   every active case through its proper owner layer.
9. If `CR-20260912-0003` or `CR-20260913-0002` is approved and
   applied before this request, compare the then-current `spec-0012`
   cases and all named ledger rows with this request's baseline before
   applying any action. If a reset, retirement, test ownership or impact
   path has changed, restate this request and obtain review of that
   restatement before its owner rerun. If this request applies first,
   each older CR's own rerun reads its reconciled ledger and retains its
   distinct decisions. Under `CR-20260913-0002`'s evidence-layout
   Option 1, `TDD-0384` remains that request's separate decision.

## Resolution

User approved Option 1. Before the six retirements, the owner re-read their
current ledger cells and corrected the draft's false `Evidence = -` premise.
All six are `Status = done` with the descriptive Evidence strings reproduced
verbatim in action 3. The strings do not prove execution, but they also do not
support `never executed`. Each retirement must preserve its actual Evidence
cell in the CR and ID reservation tombstone with its test disposition. The
approved row and case treatment is unchanged. An independent review confirmed
this factual correction needs no new choice. Scoped SDD validation then exposed
that the validator counts a declared `Level: L1` case as a coverage target even
when its heading says `Status: superseded`. An independent review confirmed
that removing former `TC-0012-0321` from active `06_Test-Cases.md` and
retaining its old wording, superseded status and `TC-0012-0357` successor in
`09_delta.md` mechanically realizes Option 1's `TDD-0365` retirement. The owner
rerun is in progress.

The owner rerun then completed actions 1, 3 and 5. `TC-0012-0334` and the
superseded `TC-0012-0321` left active `06_Test-Cases.md`; their wording is kept
in `09_delta.md`. `TC-0012-0325` stays declared as superseded. `TDD-0336`,
`TDD-0337` and `TDD-0338` were re-scoped to `TC-0012-0329`, `TC-0012-0323`
and `TC-0012-0326`. `TDD-0583` (`TC-0012-0324`) and `TDD-0584`
(`TC-0012-0335`, now `L3`) were seeded as `todo` Integration rows. The six
rows in action 3 were retired with tombstones in `tdd/test-list.md`. The
`certificate.test.ts` test `writes to canonical path and load returns the same
object` was deleted; every other test in that file is kept. The two removed
cases were struck from the integration annotation carrier. The retired rows
were struck from the carrier-only test backlog.

Action 2, the `/qfai-implement` preflight, reset exactly `TDD-0336`,
`TDD-0337` and `TDD-0338` from `done` to `todo` and appended this request to
each row's `DR-ID`. Each Evidence cell now cites this request. The former
`TC-Refs`, selector, status and verbatim Evidence of each row are kept as
withdrawn history in `.qfai/evidence/implement-spec-0012.md`. No other row was
reset. The reset rows and the seeded `TDD-0583` point at tests that already
exist, so they were added to the open-but-tested backlog until their
re-execution reaches `done`.

Action 4 corrected the `TDD-0364` fixture in `iteration.test.ts` to
`lap-007-state-not-represented`. `TDD-0364` stays `done`. Its selector passed
once regex-escaped; unescaped, the parentheses match no test. The test fix,
both file hashes and the shared-artifact re-verification of every other
`done` row in that file are recorded in the same evidence file. Independent
review of the test fix is still owed, as are the `Oracle proof` re-takes and
reviewer verdicts for the re-verified rows.

`Applied at` records the completed owner rerun and ledger sweep. Two later
stage runs remain: `/qfai-atdd spec-0012` writes the `TDD-0583` and
`TDD-0584` Integration tests, and `TDD-0584` needs the real handoff writer or
a faithful workflow harness. `/qfai-implement spec-0012` re-executes the three
reset rows.

Implementation-surface gap: no post-handoff writer or faithful workflow harness
exists, so TDD-0584 (TC-0012-0335) stays `todo`. The user chose on 2026-09-25
to carry its `QFAI-ATDD-112` finding in the dogfood backlog until a writer
exists.
