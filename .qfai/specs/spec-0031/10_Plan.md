# 10 Plan

- Spec: spec-0031
- Parent: CAP-0031

## Implementation Sequence

### Step 1: explicit full-harness entrypoint

- Create or update the dedicated `/qfai-prototyping-full-harness` entrypoint and keep it separate from the standard skill path.
- Make evidence and reviewer expectations visible at entrypoint level.
- Disallow auto-activation from config, env, or standard-mode flags.

### Step 2: planner/generator/evaluator loop

- Implement the premium loop with clear module boundaries between planner, generator, and evaluator.
- Feed critique and calibration through the evaluator only.
- Keep routing from the standard skill stateless: full-harness starts from user inputs, not routing artifacts.

### Step 3: iteration and termination controls

- Implement explicit iteration budget, accept/refine/pivot transitions, cap exit, and best-known output retention.
- Keep termination reason observable in evidence and review output.
- Ensure the loop can consume browser QA, observability, and handoff signals without taking ownership of their internals.

### Step 4: evidence and review outputs

- Emit iteration history, scoring trace, decisions, and reviewer-facing summaries for every run.
- Keep evidence generation mandatory regardless of accept or cap exit.
- Align output fields with downstream reviewer expectations instead of inventing a parallel format.

## File Targets

- `.qfai/assistant/skills/qfai-prototyping-full-harness/**`
- `packages/qfai/src/cli/**`
- `packages/qfai/src/core/harness/**`
- `packages/qfai/tests/integration/harness/**`
- `packages/qfai/tests/e2e/**`

## Test Strategy

- Integration: TC coverage for skill registration, stateless routing reception, auto-activation prohibition, planner/generator/evaluator boundaries, and cap/termination behavior.
- E2E: user-visible full-harness invocation, review/evidence emission, and separation from standard prototyping.
- API: none.
- Gate checks:
  - standard path must not activate full-harness implicitly
  - evidence/reviewer policy sections must be present and validated
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Premium path creep into standard prototyping: keep separate entrypoint and regression tests on the standard command.
- Ambiguous mode selection: cross-reference the three-mode model from the full-harness entrypoint.
- Missing handoff on long runs: treat evidence and handoff integration as mandatory downstream hooks, not optional polish.
