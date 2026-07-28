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
- Forbidden references:
  - `tests/api/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
  - `tests/e2e/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
- Unknown references (`US/TC/CON-API` not declared) are errors.
- AC annotations are not required in code; AC coverage is treated as indirect through TC coverage.
- `QFAI:CON-API-*` in `tests/e2e/**` is not forbidden, but contract guarantee belongs to API tests.

## Volume policy

- Floors and ratios are signals, not completion gates. This is the only
  statement in this section: no volume observation blocks completion, and none
  triggers a Change Request.
- Completion gate is validation pass with no errors:
  - `qfai validate --fail-on error`

If an observed layer distribution looks wrong:

1. Do not auto-adjust the distribution to make it look better.
2. Record the observed distribution and the rationale for it in the spec's
   `*_delta.md` or `09_Open-questions.md`.
3. Continue. The stage is not blocked.

A Change Request is reserved for `constitution/drift-protocol.md`-class events
— an actual conflict with an upstream SSOT decision. A volume observation is
not one: qfai defines no numeric floor, ratio or threshold anywhere, and no
validator emits a volume rule, so "unmet" has no tool-checkable meaning. Raising
a user-blocking Change Request against a per-project judgement call cannot
conclude anything actionable.

## Anti-patterns

- Do not treat `scenario.feature` or a coverage ledger as mandatory completion input.
- Do not convert all obligations into E2E.
- Do not inflate tests only to satisfy floor numbers.
- Do not re-label an existing obligation's declared layer to change how a
  distribution reads. Re-labelling is the cheapest way to clear a signal and
  the one that destroys the most information; the layer of an obligation is
  determined by what it verifies, never by how the totals look.
