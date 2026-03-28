# 09 Constraints

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Technical Constraints

### TC-01: Validator Pattern Compliance

All new validators MUST follow the existing async pattern: `(root: string, config: QfaiConfig) => Promise<Issue[]>`. No new validator signatures allowed.

### TC-02: Registration Location

All new validators MUST be registered in `packages/qfai/src/core/validate.ts` within the UI/UX validator group and exported from `packages/qfai/src/core/validators/index.ts`.

### TC-03: Performance Budget

All UIX-VAL-* validators MUST complete within the existing 2000ms UI/UX group budget (shared with existing UI/UX validators via `Promise.all`).

### TC-04: Issue Factory Usage

All new validators MUST use the `issue()` factory from `packages/qfai/src/core/validators/utils.ts` to create issues, ensuring consistent structure.

### TC-05: No LLM Dependencies

UIX-VAL-* validators MUST NOT call LLM APIs, use randomness, or depend on external network state. All checks must be deterministic and offline.

### TC-06: TypeScript Strict Mode

All new code MUST pass TypeScript strict mode without `as` type assertions (per CLAUDE.md).

### TC-07: UI-Bearing Detection Location

The shared UI-bearing detection function MUST reside in a single exported function in `validators/utils.ts` or a dedicated `validators/uiBearing.ts`. No duplicate detection logic in individual validators.

### TC-08: Semantic Rule ID Style

UIX-VAL rule IDs MUST use SCREAMING-KEBAB format, max 48 characters (e.g., `UIX-VAL-SIDECAR-MISSING`, `UIX-VAL-STRATEGY-INCOMPLETE`).

### TC-09: Validator Implementation Sequence

UIX-VAL rules MUST be implemented in the following dependency order. A later step MUST NOT be started before its prerequisite step is complete and tested.

| Step | REQ-ID(s)          | Prerequisite Step | Description                                        | Rationale                                                       |
| ---- | ------------------ | ----------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| 1    | REQ-0001, REQ-0002 | None              | Register UIX-VAL family + shared UI-bearing detection function | Foundation: all other validators depend on family registration and detection |
| 2    | REQ-0003, REQ-0016 | Step 1            | Sidecar presence check + stale asset detection     | Presence check is prerequisite for field-level completeness     |
| 3    | REQ-0004 - REQ-0009 | Step 2           | Field-level completeness validators (strategy, scoring, anchor, contracts, OQ) | Require sidecar to exist before checking its contents           |
| 4    | REQ-0010, REQ-0011, REQ-0012 | Step 3   | Cross-artifact consistency (prototyping mode, visual-review, boundary protection) | Require individual artifact validators to be stable             |
| 5    | REQ-0017           | Step 1            | Non-UI project immunity verification               | Requires detection function to confirm skip behavior            |
| 6    | REQ-0013, REQ-0014 | Step 3            | UIX-REV reviewer prompts + recommendation output   | Require UIX-VAL rules as input context for semantic review      |
| 7    | REQ-0015, REQ-0018, REQ-0019, REQ-0022 | Step 4 | Tests, fixtures, report UX, verify-pack  | Require all validators to be implemented before testing them    |
| 8    | REQ-0020, REQ-0021 | Step 2            | Migration guidance + upgrade sequencing            | Require sidecar detection to generate guidance                  |

## Operational Constraints

### OC-01: Backward Compatibility

Adding UIX-VAL-* validators MUST NOT alter the output of any existing validator or break any existing test.

### OC-02: Migration Soft Launch

Migration checks MUST default to `warning` severity. Escalation to `error` requires explicit config opt-in.

### OC-03: Single PR Delivery

All changes (validators, reviewer prompts, tests, migration, docs) MUST be delivered in a single PR for atomic review.

## Legal / Compliance Constraints

None identified for this release.

## Budget Constraints

None identified for this release.

## Deadline Constraints

v1.7.4 is the final stabilization release before v1.8. Must complete before v1.8 development begins.
