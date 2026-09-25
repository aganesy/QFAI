# Coverage Depth Matrix — spec-0004

## Scope

This matrix scores every active obligation spec-0004 declares, read from the pack in full rather
than from the rows of `tdd/test-list.md`:

- the **17 user stories** of `02_User-stories.md`, `US-0004-0001` to `US-0004-0040`;
- the **60 test cases** of `06_Test-Cases.md`: `TC-0004-0001` to `-0031`, and `TC-0004-0055` to
  `-0083`;
- the **38 business rules** of `04_Business-Rules.md`, `BR-0004-0001` to `-0038`. None carries a
  `Status:` that retires it, so all 38 own a row in the business rule table.

No story carries `x-qfai-status: planned`, and the spec is not exempt from surface scoping, so every
story owes an acceptance test. The spec references no `CON-API-*` or `CON-DB-*` contract, so no
contract-derived failure is scored.

`Status` is a row verdict and is not counted. The scored cells are the nine depth columns of the
matrix and the `Positive case`, `Negative case` and `Conditional branches` columns of the business
rule table.

## What credits a cell

A cell is credited only to a case that runs and that this pack owns.

1. **An annotation binds.** A `QFAI:SPEC-0004:TC-0004-NNNN` comment directly above a case binds
   that case. A comment at the top of a file, before any `describe`, binds every case in the file
   to every test case it names. Four files are bound this way to several test cases at once:
   `workflowPlanProvenance.test.ts` (`TC-0004-0080` to `-0083`),
   `spec0004ProfileSuffixedValidate.test.ts` (`-0055` to `-0066`), `worklogSurface.test.ts`
   (`-0016`, `-0017`, `-0019`, `-0020`, `-0021`) and `assistantTreeMigration.test.ts` (`-0015`,
   `-0022`, `-0025`).
2. **An unannotated case counts only where the obligation has no annotated case.** Where a test
   case has an annotated case, unannotated cases beside it are not credited to it, even in the
   same file. The justification names each such case, so that annotating it is the repair.
3. **A skipped case does not run.** `spec0004SaasPackageAndPackLocation.test.ts` and
   `spec0004SaasPackageAndPackLocationE2E.test.ts` carry annotations inside `describe.skip`, and
   credit nothing.
4. **An annotation with no body credits nothing.** `validatorConvergenceIntegration.test.ts`
   annotates `TC-0004-0023` to `-0031`, and its own header says those annotations are trace
   anchors with no test behind them. `TC-0004-0027` to `-0031` are credited instead to the cases
   in `worklogSurface.test.ts` whose titles name them. That file is bound to this spec, and no
   other spec claims those cases.

## How the cells are read

- **Normal path.** `TC-0004-0001` to `-0073` sit in a table with no `Type` column, so each owes a
  normal path: a case showing that the check stays silent, or passes, where its input is valid.
  `TC-0004-0074` to `-0083` declare a `Type`. Rows typed `error`, `boundary` or `edge` mark
  `Normal path` `n/a`, and a sibling carries it.
- **Error path.** A row owns every kept failure its `AC-Refs` and `EX-Ref` reach, including a
  failure a business rule declares on the same acceptance criterion. `n/a` means no chain reaches
  a failure.
- **❌ against ⚠️.** A cell is `❌` when an obligation of its category has no credited case. It is
  `⚠️` when every obligation has a case but at least one is asserted weakly or only in part. The
  paragraph for each row says which.
- **Categories with nothing to score.** `Boundary values` is `n/a` where no ordered or sized domain
  is declared. `Special values` is `n/a` unless the pack names a null, empty, placeholder or
  wrongly typed value. A missing file is scored under `Error path`. `State transitions` is `n/a`
  unless a lifecycle is declared. `Combinatorial` is `n/a` unless interacting conditions are
  declared.
- **User stories.** A story is credited only to an E2E case annotated with its ID. Its categories
  are those of the acceptance criteria whose `US-Refs` name it.
- **Depth of reading.** Every case credited to `TC-0004-0074` to `-0083` was read in full. For the
  older rows, the annotated cases were read, and the cases credited in bulk through a file-level
  annotation were read from their titles and sampled bodies. Where depth could not be confirmed
  that way, the cell is `⚠️` or `❌` and the paragraph says so.

## What was run

Each file was run on its own from `packages/qfai` at revision
`2facbb04e2e0898946280327267f46ce1299aab7`:

```bash
NO_COLOR=1 node node_modules/vitest/vitest.mjs run <file>
```

Files under `tests/validators/` need `--project validators`.

| File                                                                     | Result       |
| ------------------------------------------------------------------------ | ------------ |
| `tests/integration/validators/workflowPlanProvenance.test.ts`            | 4 passed     |
| `tests/integration/validators/triageApprovalSet.test.ts`                 | 1 passed     |
| `tests/integration/validators/triageLegacyApproval.test.ts`              | 1 passed     |
| `tests/integration/validators/triageNoApprovalRow.test.ts`               | 1 passed     |
| `tests/validators/uiEvidenceArtifacts.test.ts`                           | 8 passed     |
| `tests/validators/prototypingEvidence.test.ts`                           | 51 passed    |
| `tests/validators/assistantTreeMigration.test.ts`                        | 6 passed     |
| `tests/validators/worklogSurface.test.ts`                                | 30 passed    |
| `tests/validators/reviewerJustification.test.ts`                         | 4 passed     |
| `tests/validators/skillDocReferences.test.ts`                            | 10 passed    |
| `tests/core/validators/designContractReadiness.test.ts`                  | 109 passed   |
| `tests/core/prototyping/designMdViolations.test.ts`                      | 120 passed   |
| `tests/codex/agents.test.ts`                                             | 17 passed    |
| `tests/integration/validatorConvergenceIntegration.test.ts`              | 7 passed     |
| `tests/integration/completionContract.test.ts`                           | 13 passed    |
| `tests/integration/spec0004ProfileSuffixedValidate.test.ts`              | 12 passed    |
| `tests/integration/cli/commands/validateSaasPackage.passes.test.ts`      | 2 passed     |
| `tests/unit/core/validators/saasPackageAttestation.test.ts`              | 5 passed     |
| `tests/unit/core/validators/auditProfileDualShape.test.ts`               | 4 passed     |
| `tests/unit/core/validators/auditProfileBandReject.test.ts`              | 4 passed     |
| `tests/integration/scripts/checkPackLocations.misplaced.test.ts`         | 1 passed     |
| `tests/integration/scripts/checkPackLocations.allowedRoot.test.ts`       | 2 passed     |
| `tests/integration/scripts/checkPackLocations.scope.test.ts`             | 2 passed     |
| `tests/e2e/spec0004ProfileSuffixedValidateE2E.test.ts`                   | 3 passed     |
| `tests/skill/prototypingSkill.test.ts`                                   | 25 passed    |
| `tests/integration/spec0004SaasPackageAndPackLocation.test.ts`           | 7 skipped    |
| `tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts`                | 6 skipped    |
| `tests/core/validate.test.ts` (named by `TDD-0001`, `TDD-0002`)          | no such file |
| `tests/validators/prototypingDesignSystem.test.ts` (named by `TDD-0007`) | no such file |

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0004-0001 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0016 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0020 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0027 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0028 | ❌                     | ❌          | ❌         | ❌         | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0029 | ❌                     | ❌          | ❌         | n/a        | ❌              | ❌             | n/a               | n/a           | ❌              | ❌     |
| US-0004-0030 | ❌                     | ❌          | ❌         | n/a        | n/a             | ❌             | n/a               | n/a           | ❌              | ❌     |
| US-0004-0031 | ❌                     | ❌          | ❌         | n/a        | ❌              | n/a            | ❌                | ❌            | ❌              | ❌     |
| US-0004-0032 | ❌                     | ❌          | ❌         | n/a        | ❌              | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0033 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0034 | ❌                     | ✅          | ❌         | n/a        | ❌              | n/a            | ✅                | n/a           | ✅              | ❌     |
| US-0004-0035 | ❌                     | ✅          | ❌         | n/a        | n/a             | n/a            | n/a               | ❌            | ✅              | ❌     |
| US-0004-0036 | ❌                     | ✅          | ❌         | n/a        | n/a             | ❌             | n/a               | n/a           | ✅              | ❌     |
| US-0004-0037 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | ❌            | ❌              | ❌     |
| US-0004-0038 | ❌                     | ❌          | ❌         | n/a        | ❌              | n/a            | n/a               | ❌            | ❌              | ❌     |
| US-0004-0039 | ❌                     | ❌          | ❌         | ❌         | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0004-0040 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0004-0001 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0004-0002 | ⚠️                     | ⚠️          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0004-0003 | ⚠️                     | ✅          | ✅         | ✅         | n/a             | n/a            | n/a               | ⚠️            | ✅              | ⚠️     |
| TC-0004-0004 | ⚠️                     | ✅          | ✅         | ✅         | n/a             | n/a            | n/a               | ⚠️            | ✅              | ⚠️     |
| TC-0004-0005 | ✅                     | ✅          | n/a        | ⚠️         | n/a             | n/a            | n/a               | n/a           | ✅              | ⚠️     |
| TC-0004-0006 | ✅                     | ⚠️          | ⚠️         | ✅         | n/a             | n/a            | n/a               | n/a           | ✅              | ⚠️     |
| TC-0004-0007 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0004-0008 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0009 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0004-0010 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0004-0011 | ❌                     | ❌          | ❌         | n/a        | ❌              | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0012 | ❌                     | ❌          | ⚠️         | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0013 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ❌     |
| TC-0004-0014 | ⚠️                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0004-0015 | ✅                     | ✅          | ⚠️         | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0004-0016 | ❌                     | ✅          | ❌         | ✅         | n/a             | ✅             | n/a               | n/a           | ⚠️              | ❌     |
| TC-0004-0017 | ⚠️                     | ✅          | ⚠️         | ✅         | n/a             | ✅             | n/a               | n/a           | ✅              | ⚠️     |
| TC-0004-0018 | ❌                     | ❌          | ❌         | n/a        | n/a             | ❌             | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0019 | ❌                     | ❌          | ✅         | n/a        | ❌              | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0020 | ✅                     | ✅          | ✅         | ✅         | n/a             | n/a            | ⚠️                | ✅            | ⚠️              | ⚠️     |
| TC-0004-0021 | ❌                     | ❌          | ⚠️         | n/a        | ❌              | n/a            | n/a               | ❌            | ✅              | ❌     |
| TC-0004-0022 | ⚠️                     | ✅          | ⚠️         | n/a        | ❌              | n/a            | n/a               | n/a           | ⚠️              | ❌     |
| TC-0004-0023 | ✅                     | ✅          | ⚠️         | ✅         | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0004-0024 | ❌                     | ❌          | ✅         | ✅         | n/a             | n/a            | n/a               | n/a           | ⚠️              | ❌     |
| TC-0004-0025 | ❌                     | ❌          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ⚠️              | ❌     |
| TC-0004-0026 | ⚠️                     | ✅          | ⚠️         | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ⚠️     |
| TC-0004-0027 | ❌                     | ❌          | ✅         | n/a        | ⚠️              | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0028 | ❌                     | ❌          | ✅         | n/a        | ⚠️              | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0029 | ❌                     | ❌          | ✅         | n/a        | n/a             | ✅             | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0030 | ❌                     | ❌          | ✅         | n/a        | n/a             | ⚠️             | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0031 | ❌                     | ❌          | ✅         | n/a        | ⚠️              | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0055 | ❌                     | ⚠️          | ❌         | n/a        | n/a             | n/a            | ✅                | n/a           | ⚠️              | ❌     |
| TC-0004-0056 | ❌                     | ✅          | ❌         | n/a        | n/a             | n/a            | ✅                | n/a           | ✅              | ❌     |
| TC-0004-0057 | ❌                     | ❌          | ❌         | n/a        | ❌              | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0004-0058 | ⚠️                     | ✅          | ❌         | n/a        | ❌              | n/a            | n/a               | ⚠️            | ✅              | ❌     |
| TC-0004-0059 | ✅                     | ✅          | ✅         | n/a        | n/a             | n/a            | n/a               | ✅            | ✅              | ✅     |
| TC-0004-0060 | ✅                     | ✅          | ✅         | n/a        | n/a             | n/a            | n/a               | ✅            | ✅              | ✅     |
| TC-0004-0061 | ✅                     | ✅          | ✅         | n/a        | n/a             | n/a            | n/a               | ✅            | ✅              | ✅     |
| TC-0004-0062 | ✅                     | ✅          | ✅         | n/a        | n/a             | n/a            | n/a               | ✅            | ✅              | ✅     |
| TC-0004-0063 | ❌                     | ✅          | ❌         | n/a        | n/a             | ❌             | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0064 | ❌                     | ✅          | ❌         | n/a        | n/a             | ❌             | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0065 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0066 | ⚠️                     | ✅          | ❌         | n/a        | ❌              | n/a            | n/a               | ⚠️            | ✅              | ❌     |
| TC-0004-0067 | ❌                     | ✅          | ❌         | n/a        | n/a             | n/a            | n/a               | ❌            | ✅              | ❌     |
| TC-0004-0068 | ❌                     | ✅          | ❌         | ✅         | n/a             | n/a            | n/a               | ❌            | ✅              | ❌     |
| TC-0004-0069 | ❌                     | ✅          | ❌         | n/a        | ❌              | n/a            | n/a               | ✅            | ✅              | ❌     |
| TC-0004-0070 | ❌                     | ✅          | ❌         | n/a        | ❌              | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0071 | ❌                     | ❌          | ❌         | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0072 | ❌                     | ✅          | n/a        | n/a        | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0073 | ❌                     | ✅          | n/a        | ✅         | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0074 | ✅                     | ✅          | ✅         | n/a        | n/a             | n/a            | n/a               | ✅            | ⚠️              | ⚠️     |
| TC-0004-0075 | ❌                     | ❌          | ❌         | ❌         | ❌              | n/a            | n/a               | ❌            | ❌              | ❌     |
| TC-0004-0076 | ❌                     | n/a         | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0004-0077 | ❌                     | n/a         | ❌         | ❌         | n/a             | n/a            | n/a               | n/a           | ❌              | ❌     |
| TC-0004-0078 | ✅                     | n/a         | ✅         | n/a        | ✅              | ✅             | n/a               | ✅            | ✅              | ✅     |
| TC-0004-0079 | ✅                     | n/a         | n/a        | ✅         | n/a             | n/a            | n/a               | n/a           | ⚠️              | ⚠️     |
| TC-0004-0080 | ❌                     | n/a         | ❌         | ✅         | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0081 | ❌                     | n/a         | ❌         | ✅         | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0082 | ❌                     | n/a         | ❌         | ✅         | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |
| TC-0004-0083 | ❌                     | ✅          | ❌         | ✅         | n/a             | n/a            | n/a               | n/a           | ✅              | ❌     |

## Business rule coverage (§7)

`Covering TC` lists the test cases whose `AC-Refs` share an acceptance criterion with the rule.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                              | Status |
| ------------ | ------------- | ------------- | -------------------- | -------------------------------------------------------- | ------ |
| BR-0004-0001 | ❌            | n/a           | n/a                  | TC-0004-0001                                             | ❌     |
| BR-0004-0002 | ⚠️            | n/a           | n/a                  | TC-0004-0002                                             | ⚠️     |
| BR-0004-0003 | ✅            | ✅            | n/a                  | TC-0004-0003                                             | ✅     |
| BR-0004-0004 | ✅            | ✅            | n/a                  | TC-0004-0004                                             | ✅     |
| BR-0004-0005 | ✅            | n/a           | ✅                   | TC-0004-0005                                             | ✅     |
| BR-0004-0006 | ⚠️            | ⚠️            | n/a                  | TC-0004-0006                                             | ⚠️     |
| BR-0004-0007 | ❌            | n/a           | n/a                  | TC-0004-0007                                             | ❌     |
| BR-0004-0008 | ❌            | ❌            | ❌                   | TC-0004-0008                                             | ❌     |
| BR-0004-0009 | ❌            | ❌            | n/a                  | TC-0004-0009                                             | ❌     |
| BR-0004-0010 | ❌            | ❌            | n/a                  | TC-0004-0010                                             | ❌     |
| BR-0004-0011 | ❌            | ❌            | ❌                   | TC-0004-0011                                             | ❌     |
| BR-0004-0012 | ❌            | ✅            | ⚠️                   | TC-0004-0012                                             | ❌     |
| BR-0004-0013 | ❌            | ❌            | n/a                  | TC-0004-0013, TC-0004-0014                               | ❌     |
| BR-0004-0014 | ✅            | ⚠️            | n/a                  | TC-0004-0015                                             | ⚠️     |
| BR-0004-0015 | ✅            | ❌            | n/a                  | TC-0004-0016                                             | ❌     |
| BR-0004-0016 | ✅            | ⚠️            | ⚠️                   | TC-0004-0017                                             | ⚠️     |
| BR-0004-0017 | ❌            | ❌            | ❌                   | TC-0004-0018                                             | ❌     |
| BR-0004-0018 | ❌            | ✅            | n/a                  | TC-0004-0019                                             | ❌     |
| BR-0004-0019 | ✅            | ✅            | ✅                   | TC-0004-0020                                             | ✅     |
| BR-0004-0020 | ❌            | ✅            | ❌                   | TC-0004-0021                                             | ❌     |
| BR-0004-0021 | ⚠️            | n/a           | n/a                  | TC-0004-0022                                             | ⚠️     |
| BR-0004-0022 | ✅            | ❌            | n/a                  | TC-0004-0023                                             | ❌     |
| BR-0004-0023 | ❌            | ✅            | n/a                  | TC-0004-0024                                             | ❌     |
| BR-0004-0024 | ❌            | ❌            | n/a                  | TC-0004-0025                                             | ❌     |
| BR-0004-0025 | ✅            | ✅            | ❌                   | TC-0004-0055, TC-0004-0056, TC-0004-0065                 | ❌     |
| BR-0004-0026 | ❌            | ✅            | ❌                   | TC-0004-0057, TC-0004-0058, TC-0004-0066                 | ❌     |
| BR-0004-0027 | ✅            | ✅            | ✅                   | TC-0004-0059 to TC-0004-0062                             | ✅     |
| BR-0004-0028 | ✅            | ❌            | n/a                  | TC-0004-0063, TC-0004-0064                               | ❌     |
| BR-0004-0029 | ❌            | ❌            | ❌                   | TC-0004-0055 to TC-0004-0058, TC-0004-0065, TC-0004-0066 | ❌     |
| BR-0004-0030 | ✅            | ❌            | ❌                   | TC-0004-0067, TC-0004-0068                               | ❌     |
| BR-0004-0031 | ✅            | ❌            | ✅                   | TC-0004-0069, TC-0004-0070                               | ❌     |
| BR-0004-0032 | ❌            | ❌            | ❌                   | TC-0004-0071                                             | ❌     |
| BR-0004-0033 | ✅            | n/a           | ❌                   | TC-0004-0072, TC-0004-0073                               | ❌     |
| BR-0004-0034 | ✅            | ✅            | ✅                   | TC-0004-0074                                             | ✅     |
| BR-0004-0035 | ❌            | ❌            | ❌                   | TC-0004-0075, TC-0004-0076, TC-0004-0077                 | ❌     |
| BR-0004-0036 | ✅            | ✅            | ✅                   | TC-0004-0078                                             | ✅     |
| BR-0004-0037 | ✅            | n/a           | n/a                  | TC-0004-0079                                             | ✅     |
| BR-0004-0038 | ✅            | ❌            | ❌                   | TC-0004-0080 to TC-0004-0083                             | ❌     |

## The workflow authorization and plan provenance rows

These are the rows added on 2026-09-24. Every case credited to them was read in full.

### TC-0004-0074 — one approval set

The case in `triageApprovalSet.test.ts` writes one triage row for each of the eight operations and
sub-operations, each with `Approved By` `-`, and asserts that `QFAI-TRIAGE-005` falls on exactly
the rows `requiresApproval()` returns true for. It also checks that the expected set is neither
empty nor all eight rows.

- `Equivalence partitions`, `Error path`, `Combinatorial` ✅: every operation, and every `UPDATE`
  sub-operation, is a row. The approval-required partition raises the kept failure, and the other
  partition does not.
- `Oracle strength` ⚠️: the case fails if the validator keeps an approval set of its own that
  disagrees with `requiresApproval()`. That is the mutation `BR-0004-0034` is about. The expected
  rows are computed by `requiresApproval()` itself, though, so a wrong change to that function
  passes the case. `EX-0004-0042` names the six rows that need approval, and the case does not
  pin them.

### TC-0004-0078 — a row without a reference keeps the legacy check

The case in `triageLegacyApproval.test.ts` validates the same `DELETE` row twice: once with no
`Authorization-Ref` column, and once with the column holding `-`. The finding codes must be equal,
must include `QFAI-TRIAGE-005`, and must not include `QFAI-TRIAGE-011`.

- Every applicable cell is ✅. The two partitions of `AC-0004-0042` (no column, and `-`) are both
  present. The `-` placeholder is the special value and the boundary. The kept failure is
  asserted by equality with the baseline row.
- `Oracle strength` ✅: a validator that reads `-` as a reference, or skips the legacy check once
  the column exists, fails the equality. `QFAI-TRIAGE-011` is not implemented yet, so the
  "no `QFAI-TRIAGE-011`" assertion cannot fail today. The equality assertion carries the rule
  meanwhile.

### TC-0004-0079 — no check where no approval is needed

The case in `triageNoApprovalRow.test.ts` validates one `UPDATE` / `APPEND` row whose
`Authorization-Ref` resolves to no file, and asserts no `QFAI-TRIAGE-*` finding at all.

- `Equivalence partitions` and `Edge cases` ✅. `Error path` is `n/a`: `AC-0004-0043` declares no
  failure.
- `Oracle strength` ⚠️: the case fails today if `QFAI-TRIAGE-005` fires on an `APPEND` row. The
  clause the row exists for, that the reference is never read, cannot fail until the
  `QFAI-TRIAGE-011` check exists. Until then the case passes against both a correct and an
  incorrect reference check.

### TC-0004-0080 to TC-0004-0083 — the installed plans

`workflowPlanProvenance.test.ts` carries all four annotations at the top of the file, so its four
cases are bound to all four rows. They start from a tree the source `runInit` writes, and read the
findings of `validateAssistantAssets` whose file sits under the directory being checked.

| Case named after | Asserts                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `TC-0004-0080`   | an edited `bugfix.yml` gives exactly `[QFAI-ASSETS-005, error, <that file>]` under `process/workflows` |
| `TC-0004-0081`   | a deleted `process/workflows/` gives exactly one `QFAI-ASSETS-007`, against the layer                  |
| `TC-0004-0082`   | an edited memo, and a file added under `process/migrations/`, give no finding there                    |
| `TC-0004-0083`   | a fresh tree gives no finding under `process/workflows/`                                               |

`AC-0004-0044` names three failures: a fork (`QFAI-ASSETS-005`), a stale copy (`QFAI-ASSETS-004`)
and a deleted layer (`QFAI-ASSETS-007`). Each of the four rows reaches all three through
`AC-0004-0044`. The fork and the deleted layer each have an exact assertion. **The stale copy has
no case.** `tests/integration/init/upgradeStates.ts` already builds that state as the
`older-plan` overlay, but only `governedPlans.test.ts` uses it, and that file tests what `qfai init`
writes, not what `qfai validate` reports. The only `QFAI-ASSETS-004` assertion in the repository,
in `tests/core/assistantAssetProvenance.test.ts`, uses a `catalog/` file, is unannotated, and runs
none of the `process/workflows` layer.

- `Equivalence partitions` and `Error path` ❌ on all four rows: the stale partition, and the
  stale failure, have no case.
- `Edge cases` ✅: the ungoverned sibling directory (`TC-0004-0082`) and the whole-layer deletion
  reported once (`TC-0004-0081`).
- `Normal path`: ✅ on `TC-0004-0083`, `n/a` on the three rows typed `error` or `edge`.
- `Oracle strength` ✅: each case compares the exact list of findings. `TC-0004-0080` fails if
  plans are not governed, `TC-0004-0081` fails if the deletion is reported per file, and
  `TC-0004-0082` checks that the memo it edited exists, so it cannot pass on an empty directory.
  `TC-0004-0083` fails if the lock records a different hash from the one `init` wrote.

### The business rules

- **BR-0004-0034** ✅ ✅ ✅ through `TC-0004-0074`. The oracle limit above is scored on the matrix
  row, not here.
- **BR-0004-0036** ✅ ✅ ✅ through `TC-0004-0078`: both branches (no column, and `-`).
- **BR-0004-0037** ✅ through `TC-0004-0079`. `Negative case` and `Conditional branches` are
  `n/a`: the rule declares no failure and no branch. The case cannot yet fail on the clause it
  protects; see `TC-0004-0079`.
- **BR-0004-0038**: `Positive case` ✅ (`TC-0004-0082`, `-0083`). `Negative case` ❌: the fork
  and the deleted layer are covered, and the stale clause, `QFAI-ASSETS-004` for a plan that still
  holds what an earlier release wrote, has no case. `Conditional branches` ❌: fork and stale are
  the two arms of one classification, decided by whether the plan matches the lock record, and
  only the fork arm runs. The two-segment layer clause is exercised by every case, because
  `process/workflows` is the only two-segment governed layer.

## Justifications, one per row holding a ❌

Each paragraph opens with the obligation and the cells it accounts for. No decision record or
change request covers any of these cells yet.

**US-0004-0001 — `Equivalence partitions`, `Normal path`, `Oracle strength`.** No E2E case carries
this story's annotation, and its ledger row `TDD-0054` is `todo`. No acceptance criterion names the
story in `US-Refs`, so it owns no failure, edge or boundary. The unannotated E2E files were not
searched for a case producing its outcome, so these cells are scored conservatively.

**US-0004-0016 — `Equivalence partitions`, `Normal path`, `Oracle strength`.** No E2E case carries
the annotation, and `TDD-0055` is `todo`. No acceptance criterion names the story.

**US-0004-0020 — `Equivalence partitions`, `Normal path`, `Oracle strength`.** No E2E case carries
the annotation, and `TDD-0056` is `todo`. No acceptance criterion names the story.

**US-0004-0027 — `Equivalence partitions`, `Normal path`, `Oracle strength`.** No E2E case carries
the annotation, and `TDD-0057` is `todo`. No acceptance criterion names the story.

**US-0004-0028 — every scored cell but the `n/a` ones.** No E2E case, and `TDD-0058` is `todo`. The
story owns `AC-0004-0015` (non-canonical layer directory) and `AC-0004-0044` (fork, stale copy,
deleted layer, the ungoverned `process/migrations/` sibling).

**US-0004-0029 — every scored cell but the `n/a` ones.** No E2E case, and `TDD-0059` is `todo`. The
story owns `AC-0004-0016`, `-0017` and `-0026` to `-0030`: the work-log schema, broken links, the
catalog SSOT, date format and order, link element types, and the `id` format.

**US-0004-0030 — every scored cell but the `n/a` ones.** No E2E case, and `TDD-0060` is `todo`. The
story owns an empty or missing `justification:` (`AC-0004-0018`) and an incomplete handoff
(`AC-0004-0019`).

**US-0004-0031 — every scored cell but the `n/a` ones.** No E2E case, and `TDD-0061` is `todo`. The
story owns the three-condition promotion gate and the 90-day stale window.

**US-0004-0032 — every scored cell but the `n/a` ones.** No E2E case, and `TDD-0062` is `todo`. The
story owns the sunset-named deprecation finding and the required `project_memory:` block.

**US-0004-0033 — every scored cell but the `n/a` ones.** No E2E case, and `TDD-0063` is `todo`. The
story owns the broken skill reference and the informational pass-through.

**US-0004-0034 — `Equivalence partitions`, `Error path`, `Boundary values`.** The E2E case runs two
profiles and checks both suffixed files and the latest `profile`. It never runs without a profile
(`default`), never writes the legacy path, never crosses the `1.10.0` sunset, and never runs the
certify profile check. Those are the partitions, failures and boundary of `AC-0004-0031`,
`AC-0004-0032` and `BR-0004-0029`.

**US-0004-0035 — `Equivalence partitions`, `Error path`, `Combinatorial`.** The E2E case covers a
scanner-only change and a change to both files. The prompt-only change, a declared failure, and the
neither-changed change have no E2E case, so two of the four pairs are missing.

**US-0004-0036 — `Equivalence partitions`, `Error path`, `Special values`.** The E2E case rejects
an empty `justification` and accepts a three-part one. A missing field, a whitespace-only value and
a justification lacking one of its three parts (`BR-0004-0028`) have no E2E case.

**US-0004-0037 — every scored cell but the `n/a` ones.** Both annotated E2E cases sit in
`describe.skip` and never run. `TDD-0064` is `todo`.

**US-0004-0038 — every scored cell but the `n/a` ones.** Both annotated E2E cases sit in
`describe.skip` and never run. `TDD-0065` is `todo`.

**US-0004-0039 — every scored cell but the `n/a` ones.** Both annotated E2E cases sit in
`describe.skip` and never run. `TDD-0066` is `todo`.

**US-0004-0040 — every scored cell but the `n/a` ones.** No E2E case, and `TDD-0081` is `todo`.
The story owns the whole closed set of `QFAI-TRIAGE-011` checks in `AC-0004-0041`, which have no
case at any layer yet. The E2E case is written by a later phase of this run.

**TC-0004-0001 — `Equivalence partitions`, `Normal path`, `Oracle strength`.** No case carries the
annotation. The ledger row `TDD-0001` names `tests/core/validate.test.ts`, which does not exist.
Unannotated cases elsewhere that run `validateProject` were not searched, so the cells are scored
conservatively.

**TC-0004-0007 — `Equivalence partitions`, `Normal path`, `Oracle strength`.** No case carries the
annotation. `TDD-0007` names `tests/validators/prototypingDesignSystem.test.ts`, which does not
exist.

**TC-0004-0008 — `Equivalence partitions`, `Normal path`, `Error path`.** The annotated case
removes `DESIGN.md` and asserts `QFAI-DCON-030` at `error`. The passing case beside it,
`TC-3.8.1: new file set passes`, carries no annotation. An unparseable `DESIGN.md`, or one missing
a token table, is a declared failure of `AC-0004-0008`. The file's only malformed-file case expects
`QFAI-DCON-033`, not `QFAI-DCON-030`, and is unannotated.

**TC-0004-0009 — `Equivalence partitions`, `Normal path`, `Error path`, `Oracle strength`.** No
case produces `QFAI-DCON-031` for a hash mismatch with both hashes in the message. In
`designContractReadiness.test.ts`, `QFAI-DCON-031` is the missing-lock code, and a changed
`DESIGN.md` is reported as `QFAI-DCON-032`. The pack and the code disagree on the code, which is a
drift for `/qfai-sdd` to settle.

**TC-0004-0010 — `Equivalence partitions`, `Normal path`, `Error path`, `Oracle strength`.** No
case produces `QFAI-DCON-032` for a token divergence between `design-system.yaml` and `DESIGN.md`.
The divergence cases in the same file expect `QFAI-DCON-005`, and the one annotated case among them
belongs to spec-0012. The same drift as `TC-0004-0009`.

**TC-0004-0011 — `Equivalence partitions`, `Normal path`, `Error path`, `Boundary values`.** The
annotated case rejects a v1.x-shaped `review.json` and names every missing key. The valid-record
case (`returns no issues for a valid record`) is unannotated. The wrong `pivotDirective` enum and
the `proseCritique` cap, both failures of `AC-0004-0011`, sit in unannotated cases only.

**TC-0004-0012 — `Equivalence partitions`, `Normal path`.** The case that accepts every registered
`lap-*` code is unannotated, so the valid partition has no credited case.

**TC-0004-0013 — `Equivalence partitions`, `Normal path`, `Error path`.** The annotated case
covers a wrong `kind` only. The extra key and missing key named in the test case's steps, and the
valid-shape case (`accepts a designMdViolations entry whose keys are written in the other order`),
are unannotated or absent. `BR-0004-0013` gives the entry keys as
`{category, expected, found, location}`, and `AC-0004-0013` as `{kind, found}`. The pack contradicts
itself here.

**TC-0004-0016 — `Equivalence partitions`, `Error path`.** `BR-0004-0015` declares
`status ∈ {active, handoff, archived}`. No case uses `status: handoff`, and no case uses a `status`
outside the enum, which `AC-0004-0016` names as a failure.

**TC-0004-0018 — `Equivalence partitions`, `Normal path`, `Error path`, `Special values`.** The
bound cases cover an empty `justification` on `R-WORKLOG-DRIFT`. `R-REJECTED-READOPT`, a missing
field and a whitespace-only value have no case, and no case shows `R-WORKLOG-DRIFT` with a
non-empty justification being accepted.

**TC-0004-0019 — `Equivalence partitions`, `Normal path`, `Boundary values`.** The case removes
three of the five sections. No case shows a complete handoff raising nothing, or a handoff missing
exactly one section, which is where `BR-0004-0018` draws the line.

**TC-0004-0021 — `Equivalence partitions`, `Normal path`, `Boundary values`, `Combinatorial`.** The
one case uses an entry more than 500 days old. No case shows an entry inside the window raising
nothing, an entry at 90 or 91 days, or an old entry that is not `active`.

**TC-0004-0022 — `Boundary values`.** The running version is past the `1.10.0` sunset, so the
cases see only the post-sunset `error`. No case runs before the sunset, where `AC-0004-0022`
declares a warning.

**TC-0004-0024 — `Equivalence partitions`, `Normal path`.** No case shows a reference that resolves
under the four-layer layout raising no `W-SKILL-DOC-BROKEN-REF`.

**TC-0004-0025 — `Equivalence partitions`, `Normal path`.** The bound case asserts
`I-ASSISTANT-LAYER-UNSEEDED` at `info`. No case produces or reads `W-USER-EDIT-PRESERVED`, the
code the test case names, and none checks that `validate` exits 0.

**TC-0004-0027 — `Equivalence partitions`, `Normal path`.** No case credited to this row shows a
valid `YYYY-MM-DD` date raising no format finding. The CRLF case in the same file asserts no
`W-WORKLOG-SCHEMA` for a valid entry, but its title binds it to `TC-0004-0016`.

**TC-0004-0028 — `Equivalence partitions`, `Normal path`.** No case shows `updated` equal to, or
later than, `created` raising no `updatedOrder` finding.

**TC-0004-0029 — `Equivalence partitions`, `Normal path`.** No case shows an all-string `links`
array raising no `linksElementType` finding.

**TC-0004-0030 — `Equivalence partitions`, `Normal path`.** No case shows a kebab-case `id` raising
no `idFormat` finding.

**TC-0004-0031 — `Equivalence partitions`, `Normal path`.** No case shows a valid calendar date
raising no `createdFormat` finding.

**TC-0004-0055 — `Equivalence partitions`, `Error path`.** The cases run the `prototyping` and
`tdd` profiles, never a run without a profile, which `BR-0004-0025` says records `default`. The row
reaches `BR-0004-0029` through `AC-0004-0031`. Its failure for a certify read of the legacy path
after the sunset has no case.

**TC-0004-0056 — `Equivalence partitions`, `Error path`.** The same two gaps as `TC-0004-0055`.

**TC-0004-0057 — `Equivalence partitions`, `Normal path`, `Error path`, `Boundary values`,
`Oracle strength`.** No case runs inside the deprecation window, where the legacy path is written
and `D-DEPRECATED-PATH` is a warning naming `1.10.0`. That is this row's own scenario. The failure
of `BR-0004-0029` for a certify read of the legacy path also has no case.

**TC-0004-0058 — `Error path`, `Boundary values`.** The cases cover the `1.10.0` side of the sunset
only. The certify read of `BR-0004-0029` has no case.

**TC-0004-0063 — `Equivalence partitions`, `Error path`, `Special values`.** The bound cases reject
a whitespace-only `justification` and accept a three-part one. A missing field, and a justification
lacking one of the three parts `BR-0004-0028` requires, have no case.

**TC-0004-0064 — `Equivalence partitions`, `Error path`, `Special values`.** The same gaps as
`TC-0004-0063`.

**TC-0004-0065 — `Equivalence partitions`, `Normal path`, `Error path`.** The case covers a profile
mismatch. No case shows certify reading a matching `profile`, and no case covers the certify read
of the legacy path after the sunset.

**TC-0004-0066 — `Error path`, `Boundary values`.** The same gaps as `TC-0004-0058`.

**TC-0004-0067 — `Equivalence partitions`, `Error path`, `Combinatorial`.** `BR-0004-0030` passes
the profile only when three conditions hold. The bound cases cover all three holding, and the
attestation missing. A failing prototyping validate and a non-conforming handoff have no case.

**TC-0004-0068 — `Equivalence partitions`, `Error path`, `Combinatorial`.** The same gaps as
`TC-0004-0067`. The propagation case carries a `warning`, never a failing prototyping result.

**TC-0004-0069 — `Equivalence partitions`, `Error path`, `Boundary values`.** The bound cases
accept both shapes. The closed schema's rejection of an extra key, and the `3..7` band, have no case
bound to this row. The missing-`acceptance` rejection is bound to `TC-0004-0070` only.

**TC-0004-0070 — `Equivalence partitions`, `Error path`, `Boundary values`.** No case rejects a
structured item with an extra key. The `QFAI-AUD-020` case asserts the message `at most 7`, while
`BR-0004-0031` requires the band `3..7` to be named. The cases check 7 and 9 tasks, not 8, and not
the lower edge of the band.

**TC-0004-0071 — `Equivalence partitions`, `Normal path`, `Error path`.** Only a misplaced
`review-*` directory is covered. A misplaced `discussion-*` directory, also a declared failure, has
no case, and the passing cases are bound to `TC-0004-0072` only. The case accepts the proposal
`.qfai/review/review-2026-05-27/`, where the test case names `.qfai/review/2026-05-27/`.

**TC-0004-0072 — `Equivalence partitions`.** No case adds a pack under `tmp/`, the third allowed
root.

**TC-0004-0073 — `Equivalence partitions`.** The bound cases cover an untouched legacy pack and an
empty change set. No case adding a pack under an allowed root is bound to this row.

**TC-0004-0075 — every scored cell but the `n/a` ones.** No test exists yet. `TDD-0068` and
`TDD-0069` are `todo` with no test file. This phase names the cases the red phase writes: the
passing `CREATE` row of `EX-0004-0043` with two CAPs cited and one bound, placed before and after
`Depends-On`, asserting neither `QFAI-TRIAGE-011` nor `QFAI-TRIAGE-005`.

**TC-0004-0076 — every scored cell but the `n/a` ones.** No test exists yet. `TDD-0070` to
`TDD-0077` and `TDD-0082` are `todo`. The red phase writes one case per boundary of
`EX-0004-0044` to `-0048`, each asserting `QFAI-TRIAGE-011` at `error` with the row and the check
it names. `resolves-outside` is a trust-boundary check under the safety floor. Its cell cannot be
waived, and must reach ✅ before this row closes.

**TC-0004-0077 — every scored cell but the `n/a` ones.** No test exists yet. `TDD-0078` is `todo`.
The red phase writes the year-old record of `EX-0004-0049` and asserts no `QFAI-TRIAGE-011`.

**TC-0004-0080 — `Equivalence partitions`, `Error path`.** The stale copy of `AC-0004-0044` and
`BR-0004-0038` has no case. See the section on the plan provenance rows. The missing case is an
`older-plan` install asserting `[QFAI-ASSETS-004, error, process/workflows/direct.yml]`. Adding it
means a new test case in `06_Test-Cases.md`, which is a `/qfai-sdd` change.

**TC-0004-0081 — `Equivalence partitions`, `Error path`.** The same stale gap as `TC-0004-0080`.

**TC-0004-0082 — `Equivalence partitions`, `Error path`.** The same stale gap as `TC-0004-0080`.

**TC-0004-0083 — `Equivalence partitions`, `Error path`.** The same stale gap as `TC-0004-0080`.

### Business rules

**BR-0004-0001 — `Positive case`.** Its only test case, `TC-0004-0001`, has no credited case.

**BR-0004-0007 — `Positive case`.** Its only test case, `TC-0004-0007`, has no credited case.

**BR-0004-0008 — all three cells.** The passing case is unannotated, and the unparseable branch
has no `QFAI-DCON-030` case. See `TC-0004-0008`.

**BR-0004-0009 — `Positive case`, `Negative case`.** No case reports a hash drift as
`QFAI-DCON-031`. See `TC-0004-0009`.

**BR-0004-0010 — `Positive case`, `Negative case`.** No case reports a mirror divergence as
`QFAI-DCON-032`. See `TC-0004-0010`.

**BR-0004-0011 — all three cells.** The valid v3 record is unannotated. The enum and cap failures
are unannotated. The branch between the word cap and the character cap has no credited case.

**BR-0004-0012 — `Positive case`.** The accepting case for registered codes is unannotated.

**BR-0004-0013 — `Positive case`, `Negative case`.** Purity is covered by `TC-0004-0014`, but no
credited case accepts a valid entry shape, and the extra-key and missing-key rejections have no
case. The key set differs between this rule and `AC-0004-0013`.

**BR-0004-0015 — `Negative case`.** An out-of-enum `status` has no case.

**BR-0004-0017 — all three cells.** No case accepts a valid justification on `R-WORKLOG-DRIFT`.
The missing and whitespace-only values have no case. The `R-REJECTED-READOPT` branch has no case.

**BR-0004-0018 — `Positive case`.** No case shows a complete handoff raising nothing.

**BR-0004-0020 — `Positive case`, `Conditional branches`.** No case shows an entry inside the
window. No case covers the `active` against not-`active` branch, or the 90-day threshold.

**BR-0004-0022 — `Negative case`.** A block without `reads:` or `writes:` has no case, and the
missing-block case does not assert its severity.

**BR-0004-0023 — `Positive case`.** No case shows a resolving reference raising nothing.

**BR-0004-0024 — `Positive case`, `Negative case`.** No case produces `W-USER-EDIT-PRESERVED`,
places it in the Informational section, counts it in `counts.info`, or shows that it is never
escalated.

**BR-0004-0025 — `Conditional branches`.** A run with no profile, which records `default`, has no
case.

**BR-0004-0026 — `Positive case`, `Conditional branches`.** The deprecation-window branch has no
case.

**BR-0004-0028 — `Negative case`.** A justification missing one of the three parts, and a missing
field, have no case.

**BR-0004-0029 — all three cells.** No case shows certify reading a matching `profile`. No case
covers a legacy-path read by certify inside the window or after the sunset.

**BR-0004-0030 — `Negative case`, `Conditional branches`.** A failing prototyping validate and a
non-conforming handoff have no case.

**BR-0004-0031 — `Negative case`.** No case rejects an extra key, and no case asserts the `3..7`
band in the `QFAI-AUD-020` text.

**BR-0004-0032 — all three cells.** No case checks that the lane is part of `pnpm ci:lint`. A
misplaced `discussion-*` directory has no case. Only the `review-*` branch runs.

**BR-0004-0033 — `Conditional branches`.** The `tmp/` root has no case.

**BR-0004-0035 — all three cells.** No test exists yet. See `TC-0004-0075` to `-0077`.

**BR-0004-0038 — `Negative case`, `Conditional branches`.** The stale clause has no case. See the
section on the plan provenance rows.

## Rationale, one per row holding a ⚠️ and no ❌

**TC-0004-0002.** Its annotated cases read `validate.ts` as text and look for
`runCanonicalUixValidators`. They do not run the validation. A call left in a comment, or in an
unreachable branch, passes them.

**TC-0004-0003.** Credited under rule 2 to unannotated cases in `uiEvidenceArtifacts.test.ts`.
The error case removes the screenshot and the HTML together, so a missing screenshot is never
isolated. `Equivalence partitions` and the screenshot-by-HTML `Combinatorial` pairs are partial.

**TC-0004-0004.** The same cases and the same limit as `TC-0004-0003`, for the HTML file and
`QFAI-UIE-002`.

**TC-0004-0005.** An existing but empty `contracts/ui/` directory is not exercised.

**TC-0004-0006.** Credited under rule 2 to the predicate cases in `prototypingSkill.test.ts`. They
check a synthetic skill text, not the shipped asset the test case names. They assert predicate
results, not an emitted finding.

**TC-0004-0014.** One fixed input is called four times. `AC-0004-0014` asks for property tests over
generated inputs. The case spies on the clock and checks that the inputs are not mutated, but
asserts nothing about `fs`, `process` or network access.

**TC-0004-0015.** The case seeds `extras/`, not the `steering/` the test case names. It asserts
the code `W-ASSISTANT-LAYOUT` without its severity, and checks the message for one of the four
layer names.

**TC-0004-0017.** No case resolves a `spec-*` or `discussion-*` link. The warning severity is not
asserted.

**TC-0004-0020.** The promotion variants were read from their titles. Only the main case, which
asserts one finding naming the entry, was read in full. The pending-to-promoted progression is
shown as separate snapshots, not as one entry moving between states.

**TC-0004-0023.** The severity is not asserted. `AC-0004-0023` requires an error, and the case
title says the finding is a warning.

**TC-0004-0026.** The guard reads the real catalog. No run with a diverging catalog is recorded to
show that the failure names the agent. Only the `## Mission` section is compared.

**TC-0004-0074.** `Oracle strength`: see the section on the workflow authorization rows.

**TC-0004-0079.** `Oracle strength`: see the section on the workflow authorization rows.

### The remaining ⚠️ cells on rows that also hold a ❌

- **TC-0004-0012 `Error path`.** The rule's cap on `informationArchitecture` when a `lap-*` code
  is detected is checked against spec-0012, and is not verified here.
- **TC-0004-0013 `Oracle strength`.** The assertion accepts any `QFAI-PROT-002` whose message
  mentions `designMdViolations`, not the enum rejection specifically.
- **TC-0004-0016 `Oracle strength`.** The invalid-kind case asserts `length > 0` and the first
  message only.
- **TC-0004-0021 `Error path`.** The severity is not asserted.
- **TC-0004-0022 `Equivalence partitions`, `Error path`, `Oracle strength`.** The message is
  matched against `sunset:\s*v\d+\.\d+\.\d+`, not the literal `1.10.0` the test case names. Only
  the post-sunset side of the window runs, so the declared warning is never observed.
- **TC-0004-0024 `Oracle strength`.** The severity assertion accepts either `warning` or `error`.
- **TC-0004-0025 `Oracle strength`.** The assertions can fail, but they are about a different
  code.
- **TC-0004-0027, `-0028`, `-0031` `Boundary values`.** Each row has the invalid side next to its
  boundary, not the valid side: a leap day, `updated` equal to `created`.
- **TC-0004-0030 `Special values`.** Only `Foo_Bar` runs, not the `Foo Bar` and `UPPERCASE` the
  test case names.
- **TC-0004-0055.** `Normal path`: the case uses `tdd` where the test case names `default`.
  `Oracle strength`: the contents are shown to be independent only by their differing `profile`.
- **TC-0004-0058 and TC-0004-0066.** `Equivalence partitions` and `Combinatorial`: the version and
  legacy-file pairs are covered only at `1.10.0`.
- **BR-0004-0002.** A source-text read, as for `TC-0004-0002`.
- **BR-0004-0006.** Predicate-level, as for `TC-0004-0006`.
- **BR-0004-0012 `Conditional branches`.** The `informationArchitecture` cap, as above.
- **BR-0004-0014 `Negative case`.** Severity unasserted, and `extras/` used in place of `steering/`.
- **BR-0004-0016.** Severity unasserted, and no resolving `spec-*` or `discussion-*` link.
- **BR-0004-0021 `Positive case`.** The generic version pattern, as for `TC-0004-0022`.

## Findings

### Coverage and layer ownership

1. **Every obligation has a ledger row.** Each of the 60 test cases is named by at least one row's
   `TC-Refs`. Each of the 17 stories is named by an E2E row's `US-Refs`. No API obligation exists.
2. **A kept failure has no test case.** The stale-copy clause of `AC-0004-0044` and
   `BR-0004-0038` is covered by none of `TC-0004-0080` to `-0083`. Adding a test case is a
   `/qfai-sdd` change. The fixture already exists as the `older-plan` overlay.
3. **Three ledger rows name test files that do not exist.** `TDD-0001` and `TDD-0002` name
   `tests/core/validate.test.ts`, and `TDD-0007` names
   `tests/validators/prototypingDesignSystem.test.ts`. All three are `exception` rows.
4. **Five `done` rows have no annotated case.** `TDD-0003`, `-0004`, `-0006`, `-0009` and `-0010`
   are listed in the carrier-only backlog of `tests/assets/completedRowRunsARealTest.test.ts`.
5. **Annotations with no test behind them.** `validatorConvergenceIntegration.test.ts` annotates
   `TC-0004-0023` to `-0031` as anchors. The cases for `TC-0004-0027` to `-0031` carry the IDs in
   their titles only, inside a file annotated for other test cases.
6. **Annotations on skipped cases.** Both `spec0004SaasPackageAndPackLocation` files annotate
   `TC-0004-0067` to `-0073` and `US-0004-0037` to `-0039` inside `describe.skip`.
7. **`Layer` values the layer catalog does not name.** Twenty-six rows use `validators` and one
   uses `ssot-guard` as `Layer`, following `Level` values that `06_Test-Cases.md` defines for
   itself. `TDD-0048` has `Layer` `unit` while `TC-0004-0068` declares `validators`. The same
   layer is also spelled two ways: `integration` on 18 rows and `Integration` on 19, `e2e` on 3
   and `E2E` on 14.
8. **Four stories have no acceptance criterion.** `AC-0004-0001` to `-0014` carry no `US-Refs`, so
   `US-0004-0001`, `-0016`, `-0020` and `-0027` reach no criterion, failure or boundary.
9. **The reviewed cases skip the command their test cases name.** The preamble of each new section
   of `06_Test-Cases.md` says every case runs `qfai validate` (and, for the plan cases, the built
   `qfai init`). The triage cases call `validateSpecPacks`. The plan cases call the source
   `runInit` and `validateAssistantAssets`. `validate.ts` calls both validators, so this is a gap
   in fidelity, not in coverage. It is not scored as a missing cell.

### Drift for `/qfai-sdd` to settle

- `QFAI-DCON-031` and `QFAI-DCON-032` mean different things in the pack and in the tests
  (`TC-0004-0009`, `-0010`).
- `BR-0004-0013` and `AC-0004-0013` name different key sets for a `designMdViolations` entry.
- `TC-0004-0025` names `W-USER-EDIT-PRESERVED`, and the validator reports
  `I-ASSISTANT-LAYER-UNSEEDED`.
- The `QFAI-AUD-020` message names `at most 7`, and `BR-0004-0031` requires `3..7`.
- `AC-0004-0023` requires an error for a missing `project_memory:` block, and the case title calls
  the finding a warning.
- `AC-0004-0022`, `-0032` and `TC-0004-0057` describe behaviour inside a deprecation window that
  closed at `1.10.0`. The package is at `1.12.3`.

## Totals

The matrix holds 77 rows × 9 depth columns = 693 cells. The business rule table holds 38 rows × 3
columns = 114 cells.

| Cells              | ✅  | ⚠️  | ❌  | n/a | Total |
| ------------------ | --- | --- | --- | --- | ----- |
| Matrix depth cells | 132 | 43  | 196 | 322 | 693   |
| Business rule      | 36  | 8   | 45  | 25  | 114   |
| All scored cells   | 168 | 51  | 241 | 347 | 807   |

Matrix depth cells: ✅ 132 / ⚠️ 43 / ❌ 196
