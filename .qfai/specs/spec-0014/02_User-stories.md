# 02 User Stories

## US-0014-0001: Full-Scan Quality Verification

As a QFAI user, I want `/qfai-verify` to always run full-scan verification (never incremental), so that no quality issues are hidden by diff-only shortcuts.

## US-0014-0002: QFAI and Repo Gates

As a QFAI user, I want both QFAI gates (`qfai validate`) and repository gates (format/lint/type/test/build) run and recorded, so that quality evidence is complete.

## US-0014-0003: Fix Loop Until PASS

As a developer, I want failing gates to trigger a fix loop (identify root cause, fix, re-verify) until all gates PASS, so that quality issues are resolved before PR creation.

## US-0014-0004: UIX-VAL Deterministic Validation

As a QFAI user, I want deterministic UIX-VAL validators for UI/UX artifacts (sidecar presence, strategy completeness, scoring axes, etc.), so that validation is reproducible.

## US-0014-0005: Non-UI Project Safety

As a QFAI user working on a CLI/API project, I want zero UIX-VAL/UIX-REV fires on non-UI projects, so that validators do not produce false positives.

## US-0014-0006: Evidence Summary for PR

As a developer, I want a copy-paste ready evidence summary with Change Classification, gate results, and next actions, so that PR descriptions are actionable.

## US-0014-0007: Truthful Evidence State Handling

As a QFAI user, I want evidence states to be truthful (captured/skipped/failed/missing/not-applicable) and never contain placeholder text, so that quality verification outcomes are reliable and auditable.

- Refs: REQ-0013

## US-0014-0008: Browser QA Minimal Truthful Runner

As a QFAI user, I want browser QA to run with a minimal truthful runner that reports actual findings instead of always-empty results, so that browser QA contributes meaningful quality signals.

- Refs: REQ-0014

## US-0014-0009: Canonical Validator Family Enforcement

As a QFAI user, I want the verify workflow to enforce the canonical validator family defined by the 3-layer evaluation model, so that only sanctioned validators are used and results are consistent.

- Refs: REQ-0011, D-001
