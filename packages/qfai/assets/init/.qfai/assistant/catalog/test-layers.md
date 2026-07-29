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

## Layer derivation procedure (normative)

Deciding a `TC-*`'s layer is a per-TC judgement, not a constant. Use the
falsifying-oracle rule:

1. **Find the oracle.** Identify the single assertion whose removal would let a
   wrong implementation pass. That assertion, not the test's setup, is what the
   TC verifies.
2. **Restrict it to the parent BR's obligations.** Anything the oracle observes
   that the parent business rule does not own is incidental and does not raise
   the layer.
3. **Read the layer off what the oracle observes:**
   - inputs and return values only → **L1 Unit**
   - collaboration with a port through a fixture adapter (no real
     infrastructure) → **L2 Component**
   - real infrastructure state — DB rows, queue messages, files → **L3 Integration**
   - values at the service boundary — status codes, response bodies, auth and
     error contracts → **L4 API**
   - a full-system journey across UI/API/data → **L5 E2E**

### Worked examples

| Oracle asserts                                                             | Layer          |
| -------------------------------------------------------------------------- | -------------- |
| `price(order) === 1250` for a given input                                  | L1 Unit        |
| the repository port was called with the normalized key, via a fake adapter | L2 Component   |
| the row is present in the database after commit                            | L3 Integration |
| `POST /orders` returns `422` with `code: "OUT_OF_AREA"`                    | L4 API         |
| a user can register, order, and see the order in their history             | L5 E2E         |

### Obligation spanning more than one layer

**Split the row.** One TC = one oracle = one layer. If an obligation is
observable at two layers, it is two obligations: write one TC per oracle and
give each its own `Level`.

- A multi-valued `Level` cell (`L3/L5`) is **illegal**. Nothing consumes it and
  no validator can route it.
- If splitting is genuinely impossible, escalate through the Drift Protocol
  rather than inventing a combined value.

### Direction of authority (anti-pattern)

The test driver follows the declared layer. **The layer is never inferred from
how a test happens to be driven.** A unit-level obligation — one whose oracle,
after step 2, observes only inputs and return values — exercised through an
HTTP client is still L1 badly implemented; it is not an L4 test.

**Step 2 outranks step 3.** Restriction to the parent BR's obligations runs
first, so a transport the parent BR does not own is incidental and never
raises the layer. A BR that owns only the price calculation, asserted as
`response.body.price` over HTTP, reads as L1: the price is the BR-owned value,
the response envelope is the incidental transport. Step 3's "response bodies →
L4" applies only when the service-boundary values are themselves what the
parent BR owns. Inverting this is what collapses a designed pyramid into an
all-integration suite.

### Annotation routing is by ID type, not by `Level`

The derived `Level` records which oracle owns the obligation. It does **not**
move the traceability annotation. The [ATDD annotation hard gate](#atdd-annotation-hard-gate)
routes by obligation ID: `US-*` is answered from `tests/e2e/**`
(`QFAI-ATDD-111`), `TC-*` from `tests/integration/**` (`QFAI-ATDD-112`), and
`CON-API-*` from `tests/api/**` (`QFAI-ATDD-113`); a `TC-*` reference inside
`tests/api/**` or `tests/e2e/**` is rejected outright (`QFAI-ATDD-121` /
`QFAI-ATDD-122`). Two consequences bind every `TC-*` row:

- **A `TC-*` row's `Level` stays within L1–L3.** L4's goal is `CON-API-*` and
  L5's goal is `US-*` (see the layer definitions above), so an oracle that
  derives to L4 or L5 means the obligation is misfiled, not that the TC is an
  L4/L5 test. Re-file it as `CON-API-*` or `US-*` and remove the `TC-*` row.
- **An L1/L2 `Level` does not relax `QFAI-ATDD-112`.** The
  `QFAI:SPEC-XXXX:TC-YYYY` annotation is still owed to `tests/integration/**`.
  Declare L1 or L2 only when that integration-level trace exists; otherwise
  keep the row at L3, because a spec whose TC has no integration reference
  cannot pass `qfai validate --fail-on error`.

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
