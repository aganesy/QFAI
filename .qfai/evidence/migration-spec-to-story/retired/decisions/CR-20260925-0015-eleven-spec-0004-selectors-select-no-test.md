# Change Request

- ID: `CR-20260925-0015`
- Title: `Eleven completed spec-0004 ledger rows name a selector that selects no test`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-25T02:36:16Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

The eleven `spec-0004` rows below are `done`, and each was `done` before the
branch that found them started. The row-level run
`<runner> <Test file> -t '<Selector>'` of each one selects no test: every test in
the file is skipped and the run exits `0`. So each row claims a proof that no
test run carries.

The values are the same at the merge base `f52301317` and on `main`, so the
defect is on `main` as well. The cross-spec re-review re-runs each `done` row's
own selector, and it is read-only on other specs' ledgers, so it cannot write
the correction.

Two kinds of cell are in the set, and the kind decides who may repair it.

- **The selector does not resolve** (`selectorResolves` is false): its text is
  nowhere in the test file. The drift protocol lets the owning `/qfai-implement`
  write the `Selector` while that holds. Four rows: `TDD-0003`, `TDD-0004`,
  `TDD-0006`, `TDD-0034`.
- **The selector resolves but names no test**: its text is in the file, but only
  in a comment or inside an assertion, never in a test title. The validator
  passes the cell, so the drift protocol does not cover rewriting it. That write
  is an upstream change, and this record is what authorizes it. Seven rows:
  `TDD-0008`, `TDD-0009`, `TDD-0010`, `TDD-0012`, `TDD-0015`, `TDD-0023`,
  `TDD-0025`.

`TDD-0012` is a variant of the second kind. Its cell wraps a real test title in
backticks. The validator strips the quotes before it compares, so the cell
resolves; the runner does not, so `-t` matches nothing.

| Row        | TC             | Test file                                                                 | `selectorResolves` | Where the selector text occurs            |
| ---------- | -------------- | ------------------------------------------------------------------------- | ------------------ | ----------------------------------------- |
| `TDD-0003` | `TC-0004-0003` | `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`              | false              | nowhere                                   |
| `TDD-0004` | `TC-0004-0004` | `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`              | false              | nowhere                                   |
| `TDD-0006` | `TC-0004-0006` | `packages/qfai/tests/skill/prototypingSkill.test.ts`                      | false              | nowhere                                   |
| `TDD-0008` | `TC-0004-0008` | `packages/qfai/tests/core/validators/designContractReadiness.test.ts`     | true               | assertions only (16 lines)                |
| `TDD-0009` | `TC-0004-0009` | `packages/qfai/tests/core/validators/designContractReadiness.test.ts`     | true               | assertions only (16 lines)                |
| `TDD-0010` | `TC-0004-0010` | `packages/qfai/tests/core/validators/designContractReadiness.test.ts`     | true               | one assertion (line 246)                  |
| `TDD-0012` | `TC-0004-0012` | `packages/qfai/tests/validators/prototypingEvidence.test.ts`              | true               | a test title, but the cell adds backticks |
| `TDD-0015` | `TC-0004-0015` | `packages/qfai/tests/validators/assistantTreeMigration.test.ts`           | true               | comments only (lines 4, 46)               |
| `TDD-0023` | `TC-0004-0023` | `packages/qfai/tests/validators/skillDocReferences.test.ts`               | true               | a comment only (line 4)                   |
| `TDD-0025` | `TC-0004-0025` | `packages/qfai/tests/validators/assistantTreeMigration.test.ts`           | true               | comments only (lines 5, 123)              |
| `TDD-0034` | `TC-0004-0057` | `packages/qfai/tests/integration/spec0004ProfileSuffixedValidate.test.ts` | false              | nowhere                                   |

`selectorResolves` was evaluated with the predicate in
`packages/qfai/src/core/validators/tddList.ts` (`selectorEntries`,
`normalizeSelector`, `entryResolves` and the legacy comma split), against each
file at `25d428853`.

## Reproduction

Each row's own selector, run from `packages/qfai` in a clean clone of
`25d428853`. Every run exits `0` and selects no test:

```text
node node_modules/vitest/vitest.mjs run tests/validators/uiEvidenceArtifacts.test.ts -t "missing screenshot" --reporter=verbose
      Tests  8 skipped (8)
node node_modules/vitest/vitest.mjs run tests/validators/uiEvidenceArtifacts.test.ts -t "missing html" --reporter=verbose
      Tests  8 skipped (8)
node node_modules/vitest/vitest.mjs run tests/skill/prototypingSkill.test.ts -t "current skill contract" --reporter=verbose
      Tests  25 skipped (25)
node node_modules/vitest/vitest.mjs run tests/core/validators/designContractReadiness.test.ts -t "QFAI-DCON-030" --reporter=verbose
      Tests  109 skipped (109)
node node_modules/vitest/vitest.mjs run tests/core/validators/designContractReadiness.test.ts -t "QFAI-DCON-031" --reporter=verbose
      Tests  109 skipped (109)
node node_modules/vitest/vitest.mjs run tests/core/validators/designContractReadiness.test.ts -t "QFAI-DCON-032" --reporter=verbose
      Tests  109 skipped (109)
node node_modules/vitest/vitest.mjs run tests/validators/prototypingEvidence.test.ts -t '`emits QFAI-PROT-002 for a lap-\* code no registry entry declares`' --reporter=verbose
      Tests  51 skipped (51)
node node_modules/vitest/vitest.mjs run tests/validators/assistantTreeMigration.test.ts -t "4-layer enum guard" --reporter=verbose
      Tests  6 skipped (6)
node node_modules/vitest/vitest.mjs run tests/validators/skillDocReferences.test.ts -t "project_memory enforcement" --reporter=verbose
      Tests  10 skipped (10)
node node_modules/vitest/vitest.mjs run tests/validators/assistantTreeMigration.test.ts -t "W-USER-EDIT-PRESERVED info" --reporter=verbose
      Tests  6 skipped (6)
node node_modules/vitest/vitest.mjs run tests/integration/spec0004ProfileSuffixedValidate.test.ts -t 'TC-0004-0057: legacy path retained with D-DEPRECATED-PATH \(sunset 1\.10\.0\)' --reporter=verbose
      Tests  12 skipped (12)
```

The logs are `tmp/xspec/logs/zero/0004-TDD-<id>.log`. The file listings in those
logs show that `spec0004ProfileSuffixedValidate.test.ts` holds cases for
`TC-0004-0055`, `-0056` and `-0058` to `-0066`, and none for `TC-0004-0057`.

## Proposed change

Write each row's `Selector` as the executed title of its own test case, where
the test file holds one. Row identity, `TC-Refs`, `US-Refs`, `Test file` and
`Layer` stay as they are, and no test changes.

| Row        | Selector to write                                                                     | Who writes it               |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------- |
| `TDD-0006` | `prototyping skill validator`                                                         | `/qfai-implement spec-0004` |
| `TDD-0008` | `TC-3.8.2: missing root DESIGN.md → DCON-030`                                         | under this record           |
| `TDD-0012` | `emits QFAI-PROT-002 for a lap-* code no registry entry declares`                     | under this record           |
| `TDD-0015` | `TC-0004-0015: emits W-ASSISTANT-LAYOUT for a non-canonical layer dir`                | under this record           |
| `TDD-0023` | `TC-0004-0023: emits warning when qfai-implement/SKILL.md is missing project_memory:` | under this record           |
| `TDD-0025` | `TC-0004-0025: emits W-USER-EDIT-PRESERVED (info) for an unseeded layer`              | under this record           |

Each value was run as the row-level command in the same clone, and each selects
tests that pass (`tmp/xspec/cr-drafts/spec0004-proposed-runs.json`):

| Row        | Result                          |
| ---------- | ------------------------------- |
| `TDD-0006` | `20 passed \| 5 skipped (25)`   |
| `TDD-0008` | `1 passed \| 108 skipped (109)` |
| `TDD-0012` | `1 passed \| 50 skipped (51)`   |
| `TDD-0015` | `1 passed \| 5 skipped (6)`     |
| `TDD-0023` | `1 passed \| 9 skipped (10)`    |
| `TDD-0025` | `1 passed \| 5 skipped (6)`     |

`TDD-0006`'s value is the title of the `describe` that validates the skill
asset, and it selects all twenty of that block's tests. `TDD-0023`'s test file
also holds four variants titled `TC-0004-0023 (...)`; the value names the base
case only.

Five rows have no test titled for their own boundary. They go to the owner
rerun, `/qfai-sdd spec-0004` Phase 2b, which decides whether the test is written
or the row is re-derived:

| Row        | Boundary (`06_Test-Cases.md`)                                 | Nearest existing test, and why it is not the boundary                                                        |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `TDD-0003` | remove screenshot evidence for a declared screen              | `declared screen に screenshot と HTML が無い場合は両方 error を返す` removes both files together            |
| `TDD-0004` | remove HTML evidence for a declared screen                    | the same joint case                                                                                          |
| `TDD-0009` | edit `DESIGN.md` after the lock is written                    | `TC-3.8.3: missing DESIGN.md.lock.yaml → DCON-031` removes the lock instead                                  |
| `TDD-0010` | token divergence between `DESIGN.md` and `design-system.yaml` | `validatePrototypingDesignContractReadiness emits DCON-032 on sha mismatch` and `TC-3.8.6` test other states |
| `TDD-0034` | consumer config still expects `.qfai/output/validate.json`    | none; the file holds no `TC-0004-0057` case                                                                  |

A passing selector is not proof that it covers the whole obligation. Before a
value is written, `completion-reviewer` confirms that the selected tests cover
the row's test case. A value it finds narrower is not written, and that row
joins the five above.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                               |
| -------------------- | ---------- | ------------------------------------------------------------ |
| `spec-0004/TDD-0003` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0004` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0006` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0008` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0009` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0010` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0012` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0015` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0023` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0025` | ledger-row | Its `done` selector selects no test, so its proof is absent. |
| `spec-0004/TDD-0034` | ledger-row | Its `done` selector selects no test, so its proof is absent. |

- Not blocked by this CR: every other row of the `spec-0004` ledger.
- Overlapping open CRs: none names these eleven rows. `CR-20260925-0007` is the
  same defect on `spec-0006`, `spec-0012` and `spec-0015` rows, and edits no
  `spec-0004` cell.

## Impact scope

- Specs: `spec-0004`
- Plans: none
- Tests: none, unless the owner rerun decides a test is written for one of the
  five rows with no titled boundary
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0004/09_delta.md`, and
  the `Selector` cells of `TDD-0008`, `TDD-0009`, `TDD-0010`, `TDD-0012`,
  `TDD-0015`, `TDD-0023` and `TDD-0025`, which resolve and are therefore outside
  the drift protocol's whitelist.

## Decision needed from user

Approve writing the six selectors above, each after `completion-reviewer`
confirms it covers its row, and routing the five rows with no titled boundary to
a `/qfai-sdd spec-0004` Phase 2b rerun?

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the approver and time here. Run
   `/qfai-sdd spec-0004` in `confirm-only` mode. It records this CR in the
   `## Change Requests` table of `spec-0004/09_delta.md`.
2. For each row in `## Proposed change`, `completion-reviewer` judges the value
   against the row's `TC-Refs`. On PASS, `/qfai-implement spec-0004` writes it:
   `TDD-0006` under the drift protocol, after checking that the current value
   still does not resolve, and the other five under this record.
3. Run `/qfai-sdd spec-0004` Phase 2b for `TDD-0003`, `TDD-0004`, `TDD-0009`,
   `TDD-0010` and `TDD-0034`, and for any row whose value `completion-reviewer`
   refused. It decides per row whether a test is written for the boundary or the
   row is re-derived.
4. Re-verify each written row in place, following
   `qfai-implement/references/checkpoint-verification.md`: the selector re-run
   with the names of the selected tests, the row's recorded mutation re-taken and
   reverted where it has one, the restored GREEN, and fresh
   `implementation-reviewer` and `completion-reviewer` verdicts, recorded in
   `implement-spec-0004.md`.
5. Fill `Resolution` and `Applied at` once every row is written and re-verified,
   or has been re-derived under step 3.

## Resolution

Pending explicit approval and the owner rerun.
