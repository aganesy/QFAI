# 10 Plan

- Spec: spec-0033
- Parent: CAP-0033

## Implementation Sequence

### Step 1: handoff artifact schema

- Define the resumable artifact format for long-running premium sessions.
- Keep only the state needed for resumption, review, and debugging.
- Strip credentials and sensitive execution context before persistence.

### Step 2: writer/reader pair

- Implement artifact write on interruption and read on resume.
- Validate corruption/incompatibility explicitly and fall back cleanly when resume is not possible.
- Keep normal completion paths free from partial handoff leftovers.

### Step 3: display-only and stub-only detection

- Implement heuristic detectors for render-only outputs and stub-heavy outputs.
- Return precise locations and confidence/rationale so the evaluator can act on them.
- Keep these detectors advisory to the loop controller rather than mutating output directly.

### Step 4: harness integration

- Invoke handoff and detection hooks from the premium loop at stable points.
- Feed findings into refine/pivot decisions without coupling the detectors to generator internals.
- Ensure resumed sessions continue to emit evidence coherently.

## File Targets

- `packages/qfai/src/core/handoff/**`
- `packages/qfai/src/core/detection/**`
- `packages/qfai/src/core/harness/**`
- `packages/qfai/tests/integration/handoff/**`
- `packages/qfai/tests/integration/detection/**`
- `packages/qfai/tests/e2e/**`

## Test Strategy

- Integration: TC coverage for interruption write paths, corruption handling, resume success, credential stripping, display-only detection, stub-only detection, and mixed partial-stub cases.
- E2E: representative interrupted premium session resume and evaluator feedback loops driven by detection findings.
- API: none.
- Gate checks:
  - resume path works without leaked credentials
  - detection returns structured findings rather than booleans only
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Oversized or unstable handoff artifacts: persist minimal resumable state only.
- False positives in heuristic detection: keep fixtures for mixed real/stub and display-plus-logic cases.
- Resume incompatibility after future schema changes: version the artifact schema from the start and reject incompatible resumes cleanly.
