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
