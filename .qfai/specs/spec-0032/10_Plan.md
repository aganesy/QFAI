# 10 Plan

- Spec: spec-0032
- Parent: CAP-0032

## Implementation Sequence

### Step 1: metrics model

- Define the per-iteration and aggregate metrics emitted by premium runs.
- Keep the payload secret-safe and machine-readable.
- Make the metrics model stable enough for evidence and review consumption without turning it into a public API contract.

### Step 2: writer and buffering

- Implement local persistence for metrics and summary output.
- Keep emission fail-open so observability never blocks a run.
- Record enough context to reconstruct cost/time posture after the run completes.

### Step 3: mode guidance

- Implement guidance that recommends low-cost, standard, or full-harness based on project characteristics and current capability profile.
- Keep guidance advisory only.
- Make the rationale explicit so users can override it knowingly.

### Step 4: reviewer drift and capability profile

- Track reviewer score drift across runs and expose the signal to report/evidence consumers.
- Build a capability profile that can be consumed by the mode-guidance layer and premium readiness checks.
- Keep thresholds configurable and non-secret.

## File Targets

- `packages/qfai/src/core/observability/**`
- `packages/qfai/src/core/report/**`
- `packages/qfai/tests/integration/observability/**`
- `packages/qfai/tests/e2e/**`

## Test Strategy

- Integration: TC coverage for per-iteration emission, aggregate summaries, fail-open write behavior, guidance recommendations, reviewer drift detection, and capability profile calculation.
- E2E: user-visible metrics/guidance generation for premium runs tied to `US-0032-*`.
- API: none.
- Gate checks:
  - metrics emitted for all premium run terminal states
  - secrets/PII absent from payload samples
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Metrics noise without actionability: keep guidance tied to emitted metrics rather than separate heuristics.
- Secret leakage: test representative payloads for redaction/omission.
- Overbinding to one storage path: keep persistence local and replaceable.
