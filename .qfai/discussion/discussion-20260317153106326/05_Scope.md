# 05 Scope — QFAI v1.6.1 Guardrail Hardening

## In Scope

| #   | Item                                 | Description                                                                                                                                   |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Validator Phase 2                    | 5 new error checks: TDDLIST_TC_NOT_COVERED, TDDLIST_EXCEPTION_MISSING_DR, TDDLIST_TEST_FILE_MISSING, TDDLIST_DUPLICATE_ID, TDDLIST_INVALID_ID |
| 2   | Report coverage summary              | Unit/component TC coverage stats per spec (total, done, exception, open, missing TC refs, exception rows, latest evidence refs)               |
| 3   | test-list.md template update         | Expand from 6 to 8 columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence                                              |
| 4   | specs/README.md documentation update | Document test-list.md as execution ledger, coverage definition, exception/DR-ID contract, and test file existence requirement                 |
| 5   | Assets tests                         | New tests for 8-column template contract, exception DR-ID contract, old skill non-regression                                                  |
| 6   | Init tests                           | Validate that generated test-list.md has correct structure and passes Phase 2 checks                                                          |
| 7   | verify-pack update                   | Include new template/docs and reject old references                                                                                           |
| 8   | Stale wording cleanup                | Remove orphan references to old 3 skills throughout the codebase                                                                              |

## Out of Scope (Anti-goals)

All of the following are deferred to **v1.6.2** and MUST NOT appear in this release.

| #   | Item                                         | Deferral Target |
| --- | -------------------------------------------- | --------------- |
| 1   | Sub-agent roster formalization               | v1.6.2          |
| 2   | Completion/evidence contract hardening       | v1.6.2          |
| 3   | Selector existence / orphan test diagnostics | v1.6.2          |
| 4   | Watch-it-fail audit enhancement              | v1.6.2          |
| 5   | Generic spec lint generalization             | v1.6.2          |
| 6   | Independent parallel rule strengthening      | v1.6.2          |
| 7   | Checkpoint verification wording hardening    | v1.6.2          |
| 8   | Evidence schema versioning                   | v1.6.2          |
| 9   | qfai upgrade / refresh templates             | v1.6.2          |

## Success Criteria

1. **All 5 Phase 2 error checks pass/fail correctly** — each check emits the expected error for its failure mode (F-6101 through F-6105) and passes for valid input.
2. **Report shows coverage summary per spec** — unit and component TC coverage statistics are displayed for every spec in the report output.
3. **`qfai init` generates 8-column template** — newly initialized specs contain the full 8-column test-list.md.
4. **verify-pack passes** — the full verification pack completes without errors.
5. **No half-migrated state** — docs, validator, and tests are all synchronized; no artefact references the old 6-column format without the new columns.
6. **No orphan references to old 3 skills** — stale wording from the pre-v1.6.1 skill set is fully removed.
