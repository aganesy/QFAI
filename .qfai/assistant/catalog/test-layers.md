# Test Layers Policy

This document is the SSOT for ATDD test-layer semantics and completion gates.

## Layer definitions

### L3 Integration

- Scope: real infrastructure integration (for example DB/queue/filesystem) within service boundaries.
- Goal: verify `TC-*` obligations from specs.
- Location rule: `tests/integration/**`.

### L4 API

- Scope: service-boundary contracts (HTTP/gRPC/etc), auth, and error contracts.
- Goal: verify `CON-API-*` obligations from contracts.
- Location rule: `tests/api/**`.

### L5 E2E

- Scope: representative full-system journeys across UI/API/data.
- Goal: verify `US-*` obligations from specs.
- Location rule: `tests/e2e/**`.

## TestKind resolution (single source)

- `tests/e2e/**` -> E2E
- `tests/api/**` -> API
- `tests/integration/**` -> Integration

## Annotation schema (code-side)

- Smallest trace unit is ID.
- Multiple IDs per test file are allowed.
- AC annotations are optional (indirect coverage through TC is acceptable).
- Allowed forms:
  - `QFAI:SPEC-0001:US-0001`
  - `QFAI:SPEC-0001:TC-0001`
  - `QFAI:CON-API-0001`

## ATDD annotation hard gate

- E2E obligations:
  - Every `US-*` in specs must be referenced at least once from `tests/e2e/**` (no exception).
  - Use `QFAI:SPEC-XXXX:US-YYYY` annotations.
- Integration obligations:
  - Every `TC-*` in specs must be referenced at least once from `tests/integration/**`.
  - Use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
- API obligations:
  - Every declared `CON-API-*` must be referenced at least once from `tests/api/**`.
  - Use `QFAI:CON-API-XXXX` annotations.
  - **Deferral.** `/qfai-sdd` authors contracts in Phase 0 (Contracts-first) and
    slices them in Phase 2, so a contract legitimately exists before its slice
    ships. A contract that declares `x-qfai-status: planned` is excluded from
    the `QFAI-ATDD-113` obligation and reported as `QFAI-ATDD-114` (`info`)
    instead. Remove the marker when the slice is implemented — leaving it in
    place on a shipped slice is a review finding, not a tool finding.
    - The marker counts only at the **document root**. The same key nested under
      an operation defers nothing: one path must not be able to drop the
      API-test obligation for every other `CON-API-*` the file declares.
    - Deferral removes the test obligation, not the declaration. A deferred
      `CON-API-*` stays a known ID, so writing its API test ahead of the slice
      is fine and never raises `QFAI-ATDD-103`.
    - Deferred IDs are recorded in `report/atdd-traceability/summary.{json,md}`
      under `deferred.conApi`, so an empty `missing.conApi` can be told apart
      from a project where every contract is still planned.
- Forbidden references:
  - `tests/api/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
  - `tests/e2e/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
- Unknown references (`US/TC/CON-API` not declared) are errors.
- AC annotations are not required in code; AC coverage is treated as indirect through TC coverage.
- `QFAI:CON-API-*` in `tests/e2e/**` is not forbidden, but contract guarantee belongs to API tests.

## Volume policy

- Floors and ratios are signals, not completion gates.
- Completion gate is validation pass with no errors:
  - `qfai validate --fail-on error`

If a volume signal is unmet:

1. STOP auto-adjustment.
2. Raise a Change Request with 3 options and recommendation.
3. Wait for explicit user approval.
4. Update upstream artifacts via owner-phase rerun when required.

## Anti-patterns

- Do not treat `scenario.feature` or a coverage ledger as mandatory completion input.
- Do not convert all obligations into E2E.
- Do not inflate tests only to satisfy floor numbers.
