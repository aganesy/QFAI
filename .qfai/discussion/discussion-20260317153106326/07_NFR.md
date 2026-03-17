# 07 Non-Functional Requirements — QFAI v1.6.1 Guardrail Hardening

## Requirements

| NFR-ID   | Title                       | Description                                                                                       | Measurable Target                                           | Source        |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------- |
| NFR-0001 | Backwards Compatibility     | Existing specs without test-list.md MUST continue to emit warning (not error) for TDDLIST_MISSING | TDDLIST_MISSING remains warning severity                    | SRC-0003      |
| NFR-0002 | Validation Performance      | Phase 2 checks MUST not significantly degrade validate execution time                             | < 2x increase in validate wall time for typical project     | SRC-0001      |
| NFR-0003 | Multi-language Independence | Validator Phase 2 MUST not depend on programming language of test files                           | Passes for TypeScript, Python, Go, and Java test file paths | SRC-0002 §1   |
| NFR-0004 | Error Message Actionability | Every Phase 2 error MUST include file path, row number, and guidance on what to edit              | 100% of Phase 2 errors include path + row + fix hint        | SRC-0001 §7.2 |
| NFR-0005 | Single PR Coherence         | All v1.6.1 changes MUST ship in a single PR with no half-migrated state                           | PR contains validator + report + docs + tests + verify-pack | SRC-0001 §2.1 |
| NFR-0006 | No Scope Creep              | v1.6.1 MUST NOT include any v1.6.2 items                                                          | 0 v1.6.2 features in PR diff                                | SRC-0001 §2.3 |

## Verification Approach

| NFR-ID   | How Verified                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------ |
| NFR-0001 | Test suite includes a spec without test-list.md; validator emits TDDLIST_MISSING at warning level      |
| NFR-0002 | Benchmark validate on reference project before and after; wall time delta < 2x                         |
| NFR-0003 | Test fixtures include .ts, .py, .go, and .java test file paths; all resolve correctly                  |
| NFR-0004 | Snapshot tests assert error output contains file path, row number, and fix hint for each Phase 2 error |
| NFR-0005 | verify-pack runs on the PR branch and passes; manual review confirms no partial migration              |
| NFR-0006 | PR diff reviewed against v1.6.2 anti-goal list; no overlap found                                       |
