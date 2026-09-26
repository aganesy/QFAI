# Change Request

- ID: `CR-20260925-0007`
- Title: `Ten completed ledger rows name a selector their test file does not contain`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-25T00:25:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

The ten `done` rows below each name a `Selector` that appears nowhere in the
row's `Test file`. The row-level run `<runner> <Test file> -t '<Selector>'`
therefore selects no test, and the row claims a proof no test carries. The
validator reports every one of them as `TDDLIST_SELECTOR_UNRESOLVED`.

The values are the same at the merge base `f52301317`, so the defect is on
`main` as well. The cross-spec re-review re-runs each `done` row's own selector,
and it is read-only on other specs' ledgers, so it cannot write the correction.

| Row                  | Obligation     | Layer  | Test file                                                                                    |
| -------------------- | -------------- | ------ | -------------------------------------------------------------------------------------------- |
| `spec-0006/TDD-0020` | `US-0006-0007` | `e2e`  | `packages/qfai/tests/e2e/spec0006DoctorProbeOrderE2E.test.ts`                                |
| `spec-0015/TDD-0020` | `US-0015-0007` | `E2E`  | `packages/qfai/tests/e2e/spec0015ReviewerGateFindingsE2E.test.ts`                            |
| `spec-0012/TDD-0455` | `TC-0012-0435` | `unit` | `packages/qfai/tests/unit/core/prototyping/scanners/unwrapVar.test.ts`                       |
| `spec-0012/TDD-0463` | `US-0012-0122` | `e2e`  | `packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts`                          |
| `spec-0012/TDD-0464` | `TC-0012-0438` | `unit` | `packages/qfai/tests/unit/core/prototyping/proseCritique/countWords.cjk.test.ts`             |
| `spec-0012/TDD-0472` | `TC-0012-0467` | `unit` | `packages/qfai/tests/unit/core/prototyping/captureMd5.test.ts`                               |
| `spec-0012/TDD-0475` | `US-0012-0125` | `e2e`  | `packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts`                          |
| `spec-0012/TDD-0480` | `TC-0012-0444` | `unit` | `packages/qfai/tests/unit/core/prototyping/iteration.evidenceRefs.test.ts`                   |
| `spec-0012/TDD-0506` | `TC-0012-0466` | `unit` | `packages/qfai/tests/unit/cli/commands/prototypingIterate.blockedSummary.categories.test.ts` |
| `spec-0012/TDD-0508` | `TC-0012-0469` | `unit` | `packages/qfai/tests/unit/core/prototyping/iterateContextJson.test.ts`                       |

## Reproduction

Build the package, then run the validator from the repository root:

```sh
(cd packages/qfai && ./node_modules/.bin/tsup)
node packages/qfai/dist/cli/index.mjs validate --fail-on never --root .
```

It reports ten `TDDLIST_SELECTOR_UNRESOLVED` errors for these rows, each with
its ledger as the target. Their `current:` lines, verbatim:

```text
current: Selector "US-0006-0007: doctor summary 2-group split + skills.integrity downgrade" was not found in its Test file for spec-0006 (row 20, Status=done)
current: Selector "TC-0012-0435: scanners call unwrapVarReference" was not found in its Test file for spec-0012 (ledger table 2, row 3, Status=done)
current: Selector "US-0012-0122: `--*-shadow*:` rgba() stripped before scan" was not found in its Test file for spec-0012 (ledger table 2, row 11, Status=done)
current: Selector "TC-0012-0438: countWords CJK 1200 + English 350 + OoB" was not found in its Test file for spec-0012 (ledger table 3, row 1, Status=done)
current: Selector "TC-0012-0467: md5 capture determinism over 100 invocations" was not found in its Test file for spec-0012 (ledger table 3, row 9, Status=done)
current: Selector "US-0012-0125: --capture opt-in (default OFF, DR-0012-0029 preserved)" was not found in its Test file for spec-0012 (ledger table 3, row 12, Status=done)
current: Selector "TC-0012-0444: iterations[].evidenceRefs[] bijects with screens[].id" was not found in its Test file for spec-0012 (ledger table 5, row 2, Status=done)
current: Selector "TC-0012-0466: [BLOCKED] category identifier set stable + additive-only" was not found in its Test file for spec-0012 (ledger table 7, row 9, Status=done)
current: Selector "TC-0012-0469: iterate-context.json schema lockdown" was not found in its Test file for spec-0012 (ledger table 7, row 11, Status=done)
current: Selector "US-0015-0007: Reviewer-Gate R-CERTIFY-VERIFY-CIRCULAR regression check" was not found in its Test file for spec-0015 (row 20, Status=done)
```

A verbose run of one named file shows the tests that do exist. For
`TDD-0472`, from `tmp/cross-spec-closure/full-missing-03.log` (the run also
covered four other files; exit code `0`):

```text
pnpm -C packages/qfai exec vitest run --reporter=verbose ... tests/unit/core/prototyping/captureMd5.test.ts ...
 ✓ |unit| tests/unit/core/prototyping/captureMd5.test.ts > md5Buffer determinism > returns identical hex digest across 100 invocations on the same input 4ms
 ✓ |unit| tests/unit/core/prototyping/captureMd5.test.ts > md5Buffer determinism > returns different digests for different inputs 1ms
```

Neither title contains the row's selector
`TC-0012-0467: md5 capture determinism over 100 invocations`. The row-level
replay recorded in `tmp/cross-spec-closure/miss-classification.tsv` reports
`Passed 0`, `Skipped 0`, `Failed 0` for each of the eight `spec-0012` rows.

## Proposed change

Write each row's `Selector` as the executed test title below. Row identity,
`TC-Refs`, `US-Refs`, `Test file` and `Layer` stay as they are, and no test
changes. A JSON array is the ledger's form for a selector with several entries.

| Row                  | Selector to write                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec-0006/TDD-0020` | `text output presents both group headers and skills.integrity always lives under the advisory group`                                                                            |
| `spec-0015/TDD-0020` | `US-0015-0007: Reviewer-Gate emits R-CERTIFY-VERIFY-CIRCULAR on regressed certify path`                                                                                         |
| `spec-0012/TDD-0455` | `["scanFonts resolves var","scanRadius resolves var","scanShadow resolves var"]`                                                                                                |
| `spec-0012/TDD-0463` | `stripped pre-scanColors`                                                                                                                                                       |
| `spec-0012/TDD-0464` | `["passes when proseCritique is 1200 Japanese","passes when proseCritique is 350 English","rejects with error text naming count form","measures an over-cap English critique"]` |
| `spec-0012/TDD-0472` | `returns identical hex digest across 100 invocations`                                                                                                                           |
| `spec-0012/TDD-0475` | `default invocation writes zero PNG/HTML`                                                                                                                                       |
| `spec-0012/TDD-0480` | `returns one screenshot ref + one html ref per declared screen id`                                                                                                              |
| `spec-0012/TDD-0506` | `["matches the locked 3-identifier set in exact order","rejects re-ordering of the category list","pins the category count to 3"]`                                              |
| `spec-0012/TDD-0508` | `["accepts the canonical 4-key shape","rejects records with additional top-level keys","rejects records missing any of the 4 required keys"]`                                   |

Every value above names tests that passed in the cross-spec re-review's verbose
file runs (`tmp/cross-spec-closure/review-draft.json`, runs `full-missing-02` to
`full-missing-05`, `full-rest-02` and `full-rest-03`). The eight `spec-0012`
values were also run as `-t` selectors, logged in
`tmp/cross-spec-closure/spec0012-selector-<row>.log`.

The drift protocol lets the owning `/qfai-implement` write a `Selector` while the
current value does not resolve, which holds for all ten. No upstream obligation
moves, so no row is reset: each row is re-verified in place, as
`qfai-implement/references/checkpoint-verification.md` requires for a `done` row
whose recorded observations a later edit invalidated.

A passing selector is not proof that it covers the whole obligation. Before a
value is written, `completion-reviewer` confirms that the selected tests cover
the row's test case or story. A value it finds narrower is not written; that row
then needs its own record for a `/qfai-sdd` Phase 2b re-derive.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                               |
| -------------------- | ---------- | ------------------------------------------------------------ |
| `spec-0006/TDD-0020` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0015/TDD-0020` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0455` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0463` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0464` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0472` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0475` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0480` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0506` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0012/TDD-0508` | ledger-row | Its `done` selector selects no test, so its proof is absent. |

- Not blocked by this CR: every other row of the three ledgers.
- Overlapping open CRs: none names these ten rows. `CR-20260923-0001` lists
  `TDD-0475` as not blocked. `CR-20260925-0001` through `CR-20260925-0005` and
  `CR-20260923-0001` also edit `spec-0012/tdd/test-list.md`, but on disjoint rows,
  and this record writes only the `Selector` cells of its own rows. It assumes
  none of them has landed and can be applied before or after them.

## Impact scope

- Specs: `spec-0006`, `spec-0012`, `spec-0015`
- Plans: none
- Tests: none
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0006/09_delta.md`,
  `.qfai/specs/spec-0012/09_delta.md`, `.qfai/specs/spec-0015/09_delta.md`. The
  `Selector` cells are written under the drift protocol's whitelist.

## Decision needed from user

Approve writing the ten selectors above, each after `completion-reviewer`
confirms it covers its row, followed by in-place re-verification of the ten rows?

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the approver and time here. Run
   `/qfai-sdd spec-0006`, `/qfai-sdd spec-0012` and `/qfai-sdd spec-0015`, each
   in `confirm-only` mode. Each records this CR in the `## Change Requests` table
   of its `09_delta.md` and writes nothing else.
2. For each row, `completion-reviewer` judges the value in `## Proposed change`
   against the row's `TC-Refs` or `US-Refs`. On PASS, the owning spec's
   `/qfai-implement` writes it into the `Selector` cell, after checking that the
   current value still does not resolve. The acceptance tests of the four `e2e`
   rows are not edited.
3. Re-verify each written row in place: the selector re-run with the names of
   the selected tests, the row's recorded mutation re-taken and reverted where
   it has one, the restored GREEN, and fresh `implementation-reviewer` and `completion-reviewer`
   verdicts. The `e2e` rows record this in their `atdd-<spec>.md` evidence, the
   `unit` rows in `implement-<spec>.md`.
4. Fill `Resolution` and `Applied at` once every row is written and re-verified,
   or has been sent to a record of its own under `## Proposed change`.

## Corrections

`spec-0015/TDD-0020` leaves this record's blocked set. Main's `6ebeb4b23` wrote
the selector `## Proposed change` gives for the row. At `03762f3cf` it selects
two cases that pass: emission at `info` with the three justification parts, and
the non-emission control. `completion-reviewer` confirmed they cover
`US-0015-0007`, which is this record's precondition for a written value, and the
cross-spec review resolves the row `re-reviewed`. Nothing is left to write for
it. The other nine rows stay blocked.

## Resolution

Pending explicit approval and the owner rerun.
