# 02 User Stories

## US Catalog

- US-0015-0001: TC Coverage Check — Validator detects unit/component TCs missing from test-list.md
- US-0015-0002: Exception DR-ID Check — Exception status requires traceable DR-ID
- US-0015-0003: Test File Existence Check — Validator verifies test files exist for completed items
- US-0015-0004: Duplicate TDD-ID Check — Validator detects duplicate TDD-IDs
- US-0015-0005: Report Coverage Visualization — Report shows per-spec unit/component TC coverage
- US-0015-0006: Template Update — test-list.md template includes 8 required columns
- US-0015-0007: TDD-ID Format Validation — Validator detects malformed TDD-IDs

## US-0015-0001: TC Coverage Check

- Parent: CAP-0015
- Goal: Validator MUST emit TDDLIST_TC_NOT_COVERED error when a unit/component TC in 06_Test-Cases.md is absent from test-list.md
- Non-goals: Integration/e2e TC coverage (those layers are out of scope)
- Notes: Maps to F-6101. TC layer is determined from 06_Test-Cases.md Layer column, not test-list.md

## US-0015-0002: Exception DR-ID Check

- Parent: CAP-0015
- Goal: Validator MUST emit TDDLIST_EXCEPTION_MISSING_DR error when Status=exception and DR-ID is empty/whitespace
- Non-goals: Validating DR-ID content or existence of the referenced DR document
- Notes: Maps to F-6102. Prevents exception abuse for coverage gaming

## US-0015-0003: Test File Existence Check

- Parent: CAP-0015
- Goal: Validator MUST emit TDDLIST_TEST_FILE_MISSING error when Status in {green, refactor, done} and Test file does not exist relative to project root
- Non-goals: Validating test file content or execution
- Notes: Maps to F-6103. Windows backslash normalization required

## US-0015-0004: Duplicate TDD-ID Check

- Parent: CAP-0015
- Goal: Validator MUST emit TDDLIST_DUPLICATE_ID error when the same TDD-ID (case-insensitive) appears more than once in a spec's test-list.md
- Non-goals: Cross-spec duplicate detection
- Notes: Maps to F-6104

## US-0015-0005: Report Coverage Visualization

- Parent: CAP-0015
- Goal: Report MUST display per-spec unit/component TC coverage stats: total, done, exception, open, missing TC refs, exception rows, latest evidence refs
- Non-goals: Report is not SSOT; 06_Test-Cases.md + test-list.md are SSOT
- Notes: Maps to F-6104. Includes actionable "what to edit" guidance

## US-0015-0006: Template Update

- Parent: CAP-0015
- Goal: test-list.md template MUST include all 8 required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence
- Non-goals: Auto-migration of existing 6-column templates
- Notes: Maps to F-6105. Users manually add DR-ID and Evidence columns

## US-0015-0007: TDD-ID Format Validation

- Parent: CAP-0015
- Goal: Validator MUST emit TDDLIST_INVALID_ID error when TDD-ID does not match TDD-NNNN pattern
- Non-goals: Sub-ID formats (e.g., TDD-0001-0001)
- Notes: Maps to F-6105. Added in v1.6.1 per DR-0020
