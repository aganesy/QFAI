# 06 Functional Requirements — QFAI v1.6.1 Guardrail Hardening

## Requirements

| REQ-ID   | Title                         | Description                                                                                                                                                      | Source         | Priority |
| -------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- |
| REQ-0001 | TC Coverage Check             | Validator MUST emit TDDLIST_TC_NOT_COVERED error when a unit/component TC-\* in 06_Test-Cases.md is not present in test-list.md                                  | SRC-0001 §4.1A | Must     |
| REQ-0002 | Exception DR-ID Check         | Validator MUST emit TDDLIST_EXCEPTION_MISSING_DR error when Status=exception and DR-ID is empty/whitespace                                                       | SRC-0001 §4.1B | Must     |
| REQ-0003 | Test File Existence Check     | Validator MUST emit TDDLIST_TEST_FILE_MISSING error when Status in {green, refactor, done} and Test file does not exist relative to project root                 | SRC-0001 §4.1C | Must     |
| REQ-0004 | Duplicate TDD-ID Check        | Validator MUST emit TDDLIST_DUPLICATE_ID error when the same TDD-ID (case-insensitive) appears more than once in a spec's test-list.md (F-6106)                  | SRC-0001 §4.1D | Must     |
| REQ-0005 | TDD-ID Format Check           | Validator MUST emit TDDLIST_INVALID_ID error when TDD-ID does not match the TDD-NNNN pattern (F-6107)                                                            | SRC-0001 §6.1  | Must     |
| REQ-0006 | Coverage Summary in Report    | Report MUST display per-spec unit/component TC coverage: total, done, exception, open, missing TC refs, exception rows. Evidence refs display deferred to v1.6.2 | SRC-0001 §4.2  | Must     |
| REQ-0007 | Actionable Guidance in Report | Report SHOULD include "what to edit" guidance for detected issue types. Full per-issue-type guidance deferred to v1.6.2                                          | SRC-0001 §7.2  | Should   |
| REQ-0008 | Template Column Update        | test-list.md template MUST include all 8 required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence                                  | SRC-0001 §4.3  | Must     |
| REQ-0009 | Specs README Update           | .qfai/specs/README.md MUST document test-list.md as execution ledger, coverage definition, exception/DR-ID contract, and test file existence requirement         | SRC-0001 §4.3  | Must     |
| REQ-0010 | Assets Tests Update           | Assets tests MUST verify 8-column template, exception DR-ID contract, old skill non-regression                                                                   | SRC-0001 §4.4  | Must     |
| REQ-0011 | Init Tests Update             | Init tests MUST verify generated test-list.md has correct structure and passes Phase 2                                                                           | SRC-0001 §4.4  | Must     |
| REQ-0012 | Verify-pack Update            | verify-pack MUST include new template/docs and reject old references                                                                                             | SRC-0001 §4.4  | Must     |
| REQ-0013 | Phase 2 Severity Level        | All Phase 2 checks MUST be error severity (not warning)                                                                                                          | SRC-0001 §6.3  | Must     |
| REQ-0014 | TC Level Filtering            | TC coverage check MUST only target TCs with Level=unit or Level=component in 06_Test-Cases.md                                                                    | OQ-0003, D-003 | Must     |
| REQ-0015 | Path Resolution               | Test file existence check MUST resolve paths relative to project root                                                                                            | OQ-0001, D-001 | Must     |

## Design Decisions

| Decision                                                                     | Rationale                                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Test file path = project root relative                                       | Enables language-agnostic file existence checks without build tool assumptions (REQ-0015)                    |
| DR-ID + Evidence = required columns                                          | Prevents completion fraud by ensuring every exception has a traceable decision record (REQ-0002, REQ-0008)   |
| TC Level = 06_Test-Cases.md Level column (unit\|component)                   | Scoping coverage to testable layers avoids false positives for integration/e2e TCs (REQ-0014)                |
| TDDLIST_DUPLICATE_ID / TDDLIST_INVALID_ID added as F-6106 / F-6107 in v1.6.1 | Catches duplicate and malformed IDs early before they propagate through the framework (REQ-0004, REQ-0005)   |
| All Phase 2 checks are errors (not warnings)                                 | These checks directly enable completion fraud if violated; warning severity would be insufficient (REQ-0013) |

## Failure Modes

| ID     | Error Code                   | Trigger                                                                                                            |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| F-6101 | TDDLIST_TC_NOT_COVERED       | Unit/component TC exists in 06_Test-Cases.md but is absent from test-list.md TC-Refs                               |
| F-6102 | TDDLIST_EXCEPTION_MISSING_DR | test-list.md row has Status=exception but DR-ID is empty or whitespace                                             |
| F-6103 | TDDLIST_TEST_FILE_MISSING    | test-list.md row has Status in {green, refactor, done} but Test file path does not exist                           |
| F-6104 | _(report gap)_               | Coverage not visible — report output lacks unit/component coverage visualization (addressed by REQ-0006, REQ-0007) |
| F-6105 | _(template mismatch)_        | Docs/templates do not reflect the full set of required columns (addressed by REQ-0008, REQ-0009)                   |
| F-6106 | TDDLIST_DUPLICATE_ID         | Same TDD-ID appears more than once in a single spec's test-list.md                                                 |
| F-6107 | TDDLIST_INVALID_ID           | TDD-ID does not match the TDD-NNNN pattern                                                                         |
