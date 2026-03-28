# 07 NFR (Non-Functional Requirements)

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Requirements

### NFR-0001: Validator Determinism

UIX-VAL-* validators MUST produce identical output for identical input across runs. No randomness, LLM calls, or external state dependencies.

- Measurement: Run same fixture 10 times, assert identical issue sets
- Source: SRC-0001 (Section 3)
- Priority: Must

### NFR-0002: Validation Performance Budget

All UIX-VAL-* validators combined MUST complete within the existing 2000ms UI/UX budget on a standard development machine.

- Measurement: CI benchmark with timer assertion
- Source: SRC-0005 (validate.ts UI/UX group budget)
- Priority: Must

### NFR-0003: Report Actionability

Every validation error MUST include: rule ID, severity, file path, description, and a concrete action (fix suggestion).

- Measurement: Schema assertion on report JSON output
- Source: SRC-0001 (Section 2.3)
- Priority: Must

### NFR-0004: Backward Compatibility

Adding UIX-VAL-* validators MUST NOT change the output of existing validators or break existing test suites.

- Measurement: Full existing test suite passes without modification
- Source: SRC-0001 (Section 4)
- Priority: Must

### NFR-0005: Migration Softness

Migration-related checks MUST default to `warning` severity and support configuration to escalate to `error`.

- Measurement: Default config produces warnings; explicit config produces errors
- Source: SRC-0001 (Section 4)
- Priority: Must

### NFR-0006: Error Message Clarity

Error messages MUST be self-contained (no "see docs" without inline context) and SHOULD include the expected vs. actual state.

- Measurement: Review of all error messages by QA
- Source: SRC-0001 (Section 4, Risk)
- Priority: Should

### NFR-0007: Validator Isolation

Each UIX-VAL-* validator MUST be independently testable without requiring other validators to run first.

- Measurement: Each validator test runs in isolation with own fixture
- Source: SRC-0005 (existing pattern)
- Priority: Must

### NFR-0008: Non-UI Project Zero Noise

Non-UI projects MUST receive exactly zero issues from UIX-VAL-* and UIX-REV-* checks.

- Measurement: Non-UI fixture produces empty issue array
- Source: US-D005
- Priority: Must

### NFR-0009: Rollback Capability

Validator registration MUST be modular enough to disable individual UIX-VAL-* rules via config without code changes.

- Measurement: Config flag disables a rule; validate output changes accordingly
- Source: SRC-0001 (Section 4, Rollback)
- Priority: Should

### NFR-0010: Reviewer Prompt Stability

UIX-REV-* prompt templates MUST be independently revertable without affecting UIX-VAL-* validators.

- Measurement: Revert reviewer prompt file; validator tests still pass
- Source: SRC-0001 (Section 4, Rollback)
- Priority: Should

## Summary

| Priority | Count |
| -------- | ----- |
| Must     | 7     |
| Should   | 3     |
| Total    | 10    |
