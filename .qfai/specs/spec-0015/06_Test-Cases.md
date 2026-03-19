# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level     | AC-Refs                   | EX-Ref       | Steps                                                               | Expected                                | Notes              |
| ------------ | --------- | ------------------------- | ------------ | ------------------------------------------------------------------- | --------------------------------------- | ------------------ |
| TC-0015-0001 | unit      | AC-0015-0001              | EX-0015-0001 | Parse 06_TC and test-list; check all unit/component TCs             | No TDDLIST_TC_NOT_COVERED               | Happy path         |
| TC-0015-0002 | unit      | AC-0015-0002              | EX-0015-0002 | Parse 06_TC with TC-0015-0003(unit); test-list missing TC-0015-0003 | TDDLIST_TC_NOT_COVERED for TC-0015-0003 | Negative path      |
| TC-0015-0003 | unit      | AC-0015-0003              | EX-0015-0003 | Parse 06_TC with TC-0015-0004(integration)                          | No error for TC-0015-0004               | Layer filter       |
| TC-0015-0004 | unit      | AC-0015-0001              | EX-0015-0004 | TC with status=todo in test-list                                    | Covered (todo counts)                   | Edge case          |
| TC-0015-0005 | unit      | AC-0015-0004              | EX-0015-0005 | Status=exception, DR-ID=DR-0042                                     | PASS                                    | Happy path         |
| TC-0015-0006 | unit      | AC-0015-0005              | EX-0015-0006 | Status=exception, DR-ID=""                                          | TDDLIST_EXCEPTION_MISSING_DR            | Empty DR-ID        |
| TC-0015-0007 | unit      | AC-0015-0006              | EX-0015-0007 | Status=exception, DR-ID=" "                                         | TDDLIST_EXCEPTION_MISSING_DR            | Whitespace DR-ID   |
| TC-0015-0008 | unit      | AC-0015-0007              | EX-0015-0008 | Status=todo, DR-ID=""                                               | No error                                | Non-exception      |
| TC-0015-0009 | unit      | AC-0015-0008              | EX-0015-0009 | Status=done, Test file exists                                       | PASS                                    | Happy path         |
| TC-0015-0010 | unit      | AC-0015-0009              | EX-0015-0010 | Status=green, Test file not exists                                  | TDDLIST_TEST_FILE_MISSING               | Missing file       |
| TC-0015-0011 | unit      | AC-0015-0010              | EX-0015-0011 | Status=todo, Test file not exists                                   | No error                                | Non-completed      |
| TC-0015-0012 | unit      | AC-0015-0010              | EX-0015-0012 | Status=red, Test file not exists                                    | No error                                | Red excluded       |
| TC-0015-0013 | unit      | AC-0015-0011              | EX-0015-0013 | Backslash path, file exists                                         | PASS (normalized)                       | Windows path       |
| TC-0015-0014 | unit      | AC-0015-0012              | EX-0015-0014 | All unique TDD-IDs                                                  | PASS                                    | Happy path         |
| TC-0015-0015 | unit      | AC-0015-0013              | EX-0015-0015 | TDD-0001 appears twice                                              | TDDLIST_DUPLICATE_ID                    | Duplicate          |
| TC-0015-0016 | unit      | AC-0015-0014              | EX-0015-0016 | TDD-0001 and tdd-0001                                               | TDDLIST_DUPLICATE_ID                    | case insensitive   |
| TC-0015-0017 | unit      | AC-0015-0012              | EX-0015-0017 | Single row                                                          | PASS (always unique)                    | Edge case          |
| TC-0015-0018 | unit      | AC-0015-0020              | EX-0015-0018 | TDD-0001                                                            | PASS                                    | Valid format       |
| TC-0015-0019 | unit      | AC-0015-0021              | EX-0015-0019 | TDD-ABC                                                             | TDDLIST_INVALID_ID                      | Non-numeric        |
| TC-0015-0020 | unit      | AC-0015-0022              | EX-0015-0020 | Empty TDD-ID                                                        | TDDLIST_INVALID_ID                      | Empty cell         |
| TC-0015-0021 | unit      | AC-0015-0021              | EX-0015-0021 | TDD-0001-0001                                                       | TDDLIST_INVALID_ID                      | Sub-ID format      |
| TC-0015-0022 | component | AC-0015-0015              | EX-0015-0022 | Run report on spec with mixed coverage                              | Coverage stats per spec                 | Report integration |
| TC-0015-0023 | component | AC-0015-0016              | EX-0015-0023 | Run report with missing TCs                                         | Actionable guidance shown               | Report guidance    |
| TC-0015-0024 | component | AC-0015-0017              | EX-0015-0024 | Spec with 0 unit/component TCs                                      | "0 unit/component TCs"                  | Zero TC edge       |
| TC-0015-0025 | component | AC-0015-0018              | EX-0015-0025 | qfai init on new project                                            | 8-column template                       | Init template      |
| TC-0015-0026 | component | AC-0015-0019              | EX-0015-0026 | Old 6-column template                                               | TDDLIST_REQUIRED_COLUMN_MISSING         | Old template       |
| TC-0015-0027 | unit      | AC-0015-0001,AC-0015-0022 | EX-0015-0027 | Run all Phase 2 checks                                              | All errors (not warnings)               | Severity check     |
| TC-0015-0028 | component | AC-0015-0019              | EX-0015-0028 | Spec without test-list.md                                           | TDDLIST_MISSING as warning              | Backwards compat   |
