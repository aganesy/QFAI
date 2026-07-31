# Test Layers Policy

This document is the SSOT for ATDD test-layer semantics and completion gates.

## Layer definitions

### L1 Unit

- Scope: pure decision logic — a single module's inputs and return values, with
  no port collaboration and no real infrastructure.
- Goal: verify `TC-*` obligations whose oracle observes inputs and outputs only.
- Location rule: `tests/unit/**`.

### L2 Component

- Scope: collaboration with a port through a fixture adapter (fake / in-memory),
  with no real infrastructure.
- Goal: verify `TC-*` obligations whose oracle observes the interaction with a
  port rather than infrastructure state.
- Location rule: `tests/component/**`.

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

- `tests/unit/**` -> Unit
- `tests/component/**` -> Component
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
- Integration obligations (enforced today):
  - Every `TC-*` in specs must be referenced at least once from
    `tests/integration/**`, whatever its declared `Level`. This is what
    `QFAI-ATDD-112` checks.
  - Use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
  - `tests/api/**` and `tests/e2e/**` must not carry `TC-*` annotations
    (`QFAI-ATDD-121` / `QFAI-ATDD-122`), so an L4 obligation is discharged as a
    `CON-API-*` reference, never as a `TC-*` one.

- Per-level routing (target state — **not enforced, do not follow yet**):
  - The intended end state is one required location per declared `Level`:
    L1 -> `tests/unit/**`, L2 -> `tests/component/**`,
    L3 -> `tests/integration/**`. L4 stays `CON-API-*` in `tests/api/**` and
    L5 stays `US-*` in `tests/e2e/**`.
  - **This is not live.** `buildAtddTestGlobs` scans only
    `tests/{e2e,api,integration}`, so an annotation placed in `tests/unit/**`
    or `tests/component/**` is invisible to the scanner and `QFAI-ATDD-112`
    still reports the TC as uncovered. Until the scanner and `QFAI-ATDD-112`
    resolve per-TC, keep discharging every `TC-*` in `tests/integration/**`.
- API obligations:
  - Every declared `CON-API-*` must be referenced at least once from `tests/api/**`.
  - Use `QFAI:CON-API-XXXX` annotations.
- Forbidden references:
  - `tests/api/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
  - `tests/e2e/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
- Unknown references (`US/TC/CON-API` not declared) are errors.
- A `TC-*` annotation outside the directory its `Level` routes to is a
  misplacement, whichever directory it lands in — including the two new
  locations `tests/unit/**` and `tests/component/**`.
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
