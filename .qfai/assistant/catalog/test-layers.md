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
  - Every `US-*` in a **user-facing** spec must be referenced at least once from
    `tests/e2e/**`. "User-facing" is the same surface **union**
    `/qfai-prototyping` enforces. Any one of these signals puts a spec in it:
    - frontmatter `surface_type: ui-bearing` in `01_Spec.md`;
    - a matching UI contract `.qfai/contracts/ui/<spec-id>*.yaml` — a project
      that declares its surfaces only through contracts is still in scope;
    - a legacy `# … prototyping …` heading in `01_Spec.md`;
    - the spec pinned by `qfai.config.yaml#prototyping.primarySpecId`.

    A spec that declares no user-facing surface by **any** of those signals
    owes no E2E reference, and `QFAI-ATDD-111` does not fire for it.

  - Scoping applies only when the project declares at least one UI-bearing
    spec. A project that has never declared a surface has not opted into
    surface typing, so the obligation stays project-wide for it.
  - Do not create an E2E tree whose only purpose is to receive annotations.
    That is the "convert all obligations into E2E" anti-pattern below.
  - Use `QFAI:SPEC-XXXX:US-YYYY` annotations.

- Integration obligations:
  - Every `TC-*` in specs must be referenced at least once from `tests/integration/**`.
  - Use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
- API obligations:
  - Every declared `CON-API-*` must be referenced at least once from `tests/api/**`.
  - Use `QFAI:CON-API-XXXX` annotations.
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
