# 04 Business Rules

## BR-0011-0001: Serial-by-Default Processing

- AC-Refs: AC-0011-0001

- Items are processed one test at a time in `test-list.md` order by default.
- Parallel processing requires explicit user approval and ParallelSliceDispatcher authorization.

## BR-0011-0002: Forward-Only Lifecycle

- AC-Refs: AC-0011-0002

- Valid transitions: `todo` -> `red` -> `green` -> `refactor` -> `done`.
- Any active status -> `exception` is allowed.
- Backward transitions are prohibited.

## BR-0011-0003: Test-First Enforcement

- AC-Refs: AC-0011-0003

- A failing test MUST be written before any production code.
- Production code written before a failing test exists is rejected.

## BR-0011-0004: Minimal Code Principle

- AC-Refs: AC-0011-0004

- Write the minimum production code to make the failing test pass.
- Speculative generalization is prohibited.

## BR-0011-0005: Evidence Hard Rules

- AC-Refs: AC-0011-0005

- Status-only evidence is invalid and MUST be rejected.
- Both command and result are required for RED and GREEN phases.
- Stale evidence from previous runs MUST NOT be reused.
- Empty evidence entries are rejected.

## BR-0011-0006: Reviewer Separation

- AC-Refs: AC-0011-0006

- TDDImplementer cannot serve as TDDCodeQualityReviewer for its own work.
- Both TDDSpecReviewer and TDDCodeQualityReviewer must return PASS before `done`.
