# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0015-0001 (US-0015-0001)
Scenario: All unit/component TCs covered in test-list.md
  Given 06_Test-Cases.md has a unit TC and a component TC
  And test-list.md TC-Refs contains both TCs
  When qfai validate runs
  Then no TDDLIST_TC_NOT_COVERED error is emitted

# AC-0015-0002 (US-0015-0001)
Scenario: Unit TC missing from test-list.md
  Given 06_Test-Cases.md has a unit TC
  And test-list.md TC-Refs does not contain that TC
  When qfai validate runs
  Then TDDLIST_TC_NOT_COVERED error is emitted for the missing TC

# AC-0015-0003 (US-0015-0001)
Scenario: Integration TC is not checked for coverage
  Given 06_Test-Cases.md has an integration TC
  And test-list.md TC-Refs does not contain that TC
  When qfai validate runs
  Then no TDDLIST_TC_NOT_COVERED error is emitted for that TC

# AC-0015-0004 (US-0015-0002)
Scenario: Exception with valid DR-ID passes
  Given test-list.md row has Status=exception and DR-ID=DR-0042
  When qfai validate runs
  Then no TDDLIST_EXCEPTION_MISSING_DR error is emitted

# AC-0015-0005 (US-0015-0002)
Scenario: Exception with empty DR-ID fails
  Given test-list.md row has Status=exception and DR-ID is empty
  When qfai validate runs
  Then TDDLIST_EXCEPTION_MISSING_DR error is emitted

# AC-0015-0006 (US-0015-0002)
Scenario: Exception with whitespace-only DR-ID fails
  Given test-list.md row has Status=exception and DR-ID contains only spaces
  When qfai validate runs
  Then TDDLIST_EXCEPTION_MISSING_DR error is emitted (trimmed to empty)

# AC-0015-0007 (US-0015-0002)
Scenario: Non-exception status ignores DR-ID
  Given test-list.md row has Status=todo and DR-ID is empty
  When qfai validate runs
  Then no TDDLIST_EXCEPTION_MISSING_DR error is emitted

# AC-0015-0008 (US-0015-0003)
Scenario: Completed item with existing test file passes
  Given test-list.md row has Status=done and Test file=tests/unit/foo.test.ts
  And the file tests/unit/foo.test.ts exists on disk
  When qfai validate runs
  Then no TDDLIST_TEST_FILE_MISSING error is emitted

# AC-0015-0009 (US-0015-0003)
Scenario: Completed item with missing test file fails
  Given test-list.md row has Status=green and Test file=tests/unit/bar.test.ts
  And the file tests/unit/bar.test.ts does not exist on disk
  When qfai validate runs
  Then TDDLIST_TEST_FILE_MISSING error is emitted

# AC-0015-0010 (US-0015-0003)
Scenario: Non-completed status ignores test file existence
  Given test-list.md row has Status=todo and Test file=tests/unit/baz.test.ts
  And the file does not exist
  When qfai validate runs
  Then no TDDLIST_TEST_FILE_MISSING error is emitted

# AC-0015-0011 (US-0015-0003)
Scenario: Windows backslash path is normalized
  Given test-list.md row has Status=done and Test file=tests\unit\foo.test.ts
  And the file tests/unit/foo.test.ts exists on disk
  When qfai validate runs
  Then no TDDLIST_TEST_FILE_MISSING error is emitted

# AC-0015-0012 (US-0015-0004)
Scenario: All TDD-IDs are unique
  Given test-list.md has TDD-0001, TDD-0002, TDD-0003
  When qfai validate runs
  Then no TDDLIST_DUPLICATE_ID error is emitted

# AC-0015-0013 (US-0015-0004)
Scenario: Duplicate TDD-ID detected
  Given test-list.md has TDD-0001 appearing twice
  When qfai validate runs
  Then TDDLIST_DUPLICATE_ID error is emitted

# AC-0015-0014 (US-0015-0004)
Scenario: Case-insensitive duplicate detected
  Given test-list.md has TDD-0001 and tdd-0001
  When qfai validate runs
  Then TDDLIST_DUPLICATE_ID error is emitted

# AC-0015-0015 (US-0015-0005)
Scenario: Report shows coverage stats for spec with covered TCs
  Given spec has 10 unit/component TCs all covered in test-list.md
  When qfai report runs
  Then report includes total=10, done=N, exception=M, open=K per spec

# AC-0015-0016 (US-0015-0005)
Scenario: Report shows missing TC refs
  Given spec has 10 unit/component TCs but only 8 in test-list.md
  When qfai report runs
  Then report lists 2 missing TC refs with actionable guidance

# AC-0015-0017 (US-0015-0005)
Scenario: Report handles spec with zero unit/component TCs
  Given spec has 0 unit/component TCs (only integration/e2e)
  When qfai report runs
  Then report shows "0 unit/component TCs" without false alarm

# AC-0015-0018 (US-0015-0006)
Scenario: Fresh init creates 8-column template
  Given qfai init is run on a new project
  When spec-XXXX/tdd/test-list.md is generated
  Then it contains all 8 columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence

# AC-0015-0019 (US-0015-0006)
Scenario: Old 6-column template fails Phase 1
  Given test-list.md has only 6 columns (missing DR-ID, Evidence)
  When qfai validate runs
  Then TDDLIST_REQUIRED_COLUMN_MISSING error is emitted for DR-ID and Evidence

# AC-0015-0020 (US-0015-0007)
Scenario: Valid TDD-ID format passes
  Given test-list.md has TDD-0001 (matches TDD-NNNN pattern)
  When qfai validate runs
  Then no TDDLIST_INVALID_ID error is emitted

# AC-0015-0021 (US-0015-0007)
Scenario: Non-numeric TDD-ID fails
  Given test-list.md has TDD-ABC
  When qfai validate runs
  Then TDDLIST_INVALID_ID error is emitted

# AC-0015-0022 (US-0015-0007)
Scenario: Empty TDD-ID fails
  Given test-list.md has an empty TDD-ID cell
  When qfai validate runs
  Then TDDLIST_INVALID_ID error is emitted
```

## AC Catalog (optional)

| AC-ID        | Title                            | US-Ref       | Priority |
| ------------ | -------------------------------- | ------------ | -------- |
| AC-0015-0001 | All unit/component TCs covered   | US-0015-0001 | P1       |
| AC-0015-0002 | Unit TC missing from test-list   | US-0015-0001 | P1       |
| AC-0015-0003 | Integration TC skipped           | US-0015-0001 | P1       |
| AC-0015-0004 | Exception with valid DR-ID       | US-0015-0002 | P1       |
| AC-0015-0005 | Exception with empty DR-ID       | US-0015-0002 | P1       |
| AC-0015-0006 | Exception with whitespace DR-ID  | US-0015-0002 | P1       |
| AC-0015-0007 | Non-exception ignores DR-ID      | US-0015-0002 | P1       |
| AC-0015-0008 | Completed item with test file    | US-0015-0003 | P1       |
| AC-0015-0009 | Completed item missing test file | US-0015-0003 | P1       |
| AC-0015-0010 | Non-completed ignores test file  | US-0015-0003 | P1       |
| AC-0015-0011 | Windows backslash normalization  | US-0015-0003 | P1       |
| AC-0015-0012 | All TDD-IDs unique               | US-0015-0004 | P1       |
| AC-0015-0013 | Duplicate TDD-ID detected        | US-0015-0004 | P1       |
| AC-0015-0014 | Case-insensitive duplicate       | US-0015-0004 | P1       |
| AC-0015-0015 | Report coverage stats            | US-0015-0005 | P1       |
| AC-0015-0016 | Report missing TC refs           | US-0015-0005 | P1       |
| AC-0015-0017 | Report zero unit/component TCs   | US-0015-0005 | P2       |
| AC-0015-0018 | Fresh init 8-column template     | US-0015-0006 | P1       |
| AC-0015-0019 | Old 6-column template fails      | US-0015-0006 | P1       |
| AC-0015-0020 | Valid TDD-ID format passes       | US-0015-0007 | P1       |
| AC-0015-0021 | Non-numeric TDD-ID fails         | US-0015-0007 | P1       |
| AC-0015-0022 | Empty TDD-ID fails               | US-0015-0007 | P1       |
