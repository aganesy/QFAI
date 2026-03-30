# 10 Plan

- Spec: spec-0036
- Parent: CAP-0036

## Implementation Sequence

### Step 1 (P0): Render evidence CLI wiring

- Replace placeholder "not implemented in this slice" in `packages/qfai/src/cli/commands/prototyping.ts` with actual capture path invocation.
- Connect the capture path so render evidence flows through to the capture module.
- Implement structured result type with status enum: captured / skipped / failed.
- Implement honest reporting: skipped includes reason + alternative suggestion (OQ-0006).

### Step 2 (P1): Browser QA smoke findings

- Implement real findings generation in `core/browserQa/runner.ts` smoke phase.
- Each finding must have actionable structure: selector, issue, severity, suggestion.
- URL validation: missing URL returns structured error, not empty findings.
- Ensure non-empty findings array on successful execution.

### Step 3 (P1): Browser QA visual findings (should priority)

- Implement real findings generation in visual phase.
- Same actionable structure as smoke findings.
- Visual phase findings may additionally reference screenshot data.

## Dependency Order

- Evidence wiring first (blocking) -> smoke phase -> visual phase
- Render evidence wiring (Step 1) must complete before smoke/visual work begins, as it establishes the structured result pattern reused by QA phases.

## File Targets

- `packages/qfai/src/cli/commands/prototyping.ts`
- `packages/qfai/src/core/browserQa/runner.ts`
- `packages/qfai/tests/unit/cli/renderEvidence.test.ts`
- `packages/qfai/tests/unit/core/browserQa/smokeFindings.test.ts`
- `packages/qfai/tests/unit/core/browserQa/visualFindings.test.ts`

## Test Strategy

- Unit: Mock capture tests for render evidence (captured/skipped/failed scenarios). Smoke finding assertion tests (non-empty, structure validation). Visual finding assertion tests (should priority). Skip/fail scenario tests with reason and alternative verification.
- Integration: End-to-end CLI invocation verifying placeholder removal and structured output.
- Gate checks:
  - render evidence path contains no "not implemented" placeholder
  - smoke phase returns non-empty structured findings
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Capture environment unavailability: mitigated by honest skip reporting with alternative suggestion (OQ-0006).
- Empty findings regression: guarded by BR-0036-0009 (empty result is bug) and TC-0036-0005/TC-0036-0006 assertions.
- Scope creep to interaction/accessibility phases: blocked by RJ-002 (DO NOT include interaction/accessibility in v1.7.8).
