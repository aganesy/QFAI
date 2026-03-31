# 10 Plan

- Spec: spec-0029
- Parent: CAP-0029

## Implementation Sequence

### Step 1: provider contract and adapter shell

- Define the critique provider contract and the adapter boundary used by the evaluator.
- Keep provider failures fail-open and schema-checked.
- Treat the adapter as runtime-only infrastructure, not a validate concern.

### Step 2: command/file example providers

- Implement minimal provider types needed for local and CI usage.
- Sanitize command execution inputs and keep timeout/error handling explicit.
- Make provider registration additive so teams can add providers without changing the adapter core.

### Step 3: 3-layer critique schema

- Move critique scoring to the canonical 3-layer model: `invariant`, `trendDerived`, `productSpecific`.
- Reject or migrate legacy 4-axis payloads explicitly instead of silently accepting them.
- Keep the mapping logic deterministic and reviewable.

### Step 4: configuration and integration hooks

- Add config for provider registration, timeout, and fail-open behavior.
- Expose only the inputs needed by `spec-0031` evaluator flow.
- Keep critique optional even when the full-harness loop is active.

## File Targets

- `packages/qfai/src/core/critique/types.ts`
- `packages/qfai/src/core/critique/adapter.ts`
- `packages/qfai/src/core/critique/providers/**`
- `packages/qfai/src/core/config.ts`
- `packages/qfai/tests/integration/critique/**`
- `packages/qfai/tests/e2e/**` where user-visible full-harness critique flow is exercised

## Test Strategy

- Integration: TC coverage for adapter schema validation, fail-open behavior, command timeout/error handling, and legacy-to-3-layer migration.
- E2E: only for harness-visible behavior tied to `US-0029-*`; keep provider correctness itself at integration level.
- API: none.
- Gate checks:
  - fail-open regression tests
  - 3-layer payload acceptance tests
  - legacy 4-axis rejection or migration tests
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Command injection: sanitize arguments and keep shell behavior constrained.
- Schema drift from calibration/evaluator: validate against the same 3-layer vocabulary used by `spec-0030` and `spec-0031`.
- Overcoupling to one provider: keep provider registration pluggable and example-only in core.
