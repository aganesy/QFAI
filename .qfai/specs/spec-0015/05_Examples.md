# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                             | Expected                                            | Notes                             |
| ------------ | ------------ | ----------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- |
| EX-0015-0001 | BR-0015-0002 | 06_TC has 2 unit/component test cases; test-list covers both      | PASS — all covered                                  | Happy path                        |
| EX-0015-0002 | BR-0015-0003 | 06_TC has 1 unit test case; test-list does not contain it         | TDDLIST_TC_NOT_COVERED error                        | Negative path                     |
| EX-0015-0003 | BR-0015-0001 | 06_TC has 1 integration test case; test-list does not contain it  | No error — integration excluded                     | Layer filter                      |
| EX-0015-0004 | BR-0015-0002 | 06_TC has 1 unit test case; test-list has it with Status=todo     | Covered — status irrelevant                         | Edge: todo counts as covered      |
| EX-0015-0005 | BR-0015-0004 | Status=exception, DR-ID=DR-0042                                   | PASS                                                | Happy path                        |
| EX-0015-0006 | BR-0015-0005 | Status=exception, DR-ID=""                                        | TDDLIST_EXCEPTION_MISSING_DR                        | Empty DR-ID                       |
| EX-0015-0007 | BR-0015-0005 | Status=exception, DR-ID=" "                                       | TDDLIST_EXCEPTION_MISSING_DR                        | Whitespace-only DR-ID             |
| EX-0015-0008 | BR-0015-0006 | Status=todo, DR-ID=""                                             | No error                                            | DR-ID only required for exception |
| EX-0015-0009 | BR-0015-0008 | Status=done, Test file=tests/unit/foo.test.ts (exists)            | PASS                                                | Happy path                        |
| EX-0015-0010 | BR-0015-0009 | Status=green, Test file=tests/unit/bar.test.ts (not exists)       | TDDLIST_TEST_FILE_MISSING                           | Missing test file                 |
| EX-0015-0011 | BR-0015-0007 | Status=todo, Test file=tests/unit/baz.test.ts (not exists)        | No error                                            | Non-completed status excluded     |
| EX-0015-0012 | BR-0015-0007 | Status=red, Test file=tests/unit/qux.test.ts (not exists)         | No error                                            | Red excluded                      |
| EX-0015-0013 | BR-0015-0010 | Status=done, Test file=tests\unit\foo.test.ts (backslash, exists) | PASS — normalized                                   | Windows path normalization        |
| EX-0015-0014 | BR-0015-0011 | TDD-0001, TDD-0002, TDD-0003 (all unique)                         | PASS                                                | Happy path                        |
| EX-0015-0015 | BR-0015-0012 | TDD-0001 appears twice                                            | TDDLIST_DUPLICATE_ID                                | Duplicate detection               |
| EX-0015-0016 | BR-0015-0012 | TDD-0001 and tdd-0001                                             | TDDLIST_DUPLICATE_ID                                | Case-insensitive                  |
| EX-0015-0017 | BR-0015-0011 | Single row in test-list.md                                        | Always unique — PASS                                | Edge: single row                  |
| EX-0015-0018 | BR-0015-0013 | TDD-0001                                                          | PASS — valid format                                 | Happy path                        |
| EX-0015-0019 | BR-0015-0014 | TDD-ABC                                                           | TDDLIST_INVALID_ID                                  | Non-numeric suffix                |
| EX-0015-0020 | BR-0015-0014 | Empty TDD-ID cell                                                 | TDDLIST_INVALID_ID                                  | Empty cell                        |
| EX-0015-0021 | BR-0015-0014 | TDD-0001-0001                                                     | TDDLIST_INVALID_ID                                  | Sub-ID format not valid           |
| EX-0015-0022 | BR-0015-0015 | Spec: 10 unit/component TCs, 8 done, 1 exception, 1 todo          | Report: total=10, done=8, exception=1, open=1       | Report coverage                   |
| EX-0015-0023 | BR-0015-0016 | 2 missing test cases in coverage                                  | Report: "Add missing test cases to test-list.md"    | Actionable guidance               |
| EX-0015-0024 | BR-0015-0017 | Spec with 0 unit/component TCs                                    | Report: "0 unit/component TCs"                      | Zero TC edge case                 |
| EX-0015-0025 | BR-0015-0018 | qfai init on new project                                          | test-list.md has 8 columns                          | Template generation               |
| EX-0015-0026 | BR-0015-0019 | Old 6-column test-list.md                                         | TDDLIST_REQUIRED_COLUMN_MISSING for DR-ID, Evidence | Old template detection            |
| EX-0015-0027 | BR-0015-0020 | All Phase 2 errors                                                | All are error severity, not warning                 | Severity enforcement              |
| EX-0015-0028 | BR-0015-0021 | Spec with no test-list.md                                         | TDDLIST_MISSING as warning (not error)              | Backwards compatibility           |
