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

## US-0014-0010: Canonical UIX Validator Production Path

As a QA engineer, I want verify to use only the canonical UIX validator production path (runCanonicalUixValidators and its 12 validator functions), so that verification results are not polluted by removed compatibility wrappers.

## US-0014-0011: Removed Compatibility Surface

As a QFAI maintainer, I want the package surface to expose no `validators/legacy/` namespace and no IssueCategory `compatibility`, so that stale integrations cannot depend on dead compatibility paths.

## US-0014-0012: Stale Sidecar Migration Errors

As a QFAI maintainer, I want stale sidecar artifacts (legacy filenames and legacy 4-axis evaluation content) to fail with explicit canonical migration errors, so that upgrades are guided by the active validator family instead of hidden compatibility layers.

- Refs: REQ-0010, REQ-0014

## US-0014-0013: Enforce evaluation_connection presence on Trend Scan entries

As a QFAI user, I want `qfai validate` to fail with ERROR when any 04_Sources.md Trend Scan entry lacks an `evaluation_connection` field, so that Trend -> Axis traceability is enforced at validation time.

- Refs: REQ-0015

## US-0014-0014: Reject dangling evaluation_connection references

As a QFAI user, I want `qfai validate` to fail with ERROR when an `evaluation_connection` value points to a TRD-XX axis that does not exist in 21_design_eval_trend_derived.md, so that broken references are caught before prototyping.

- Refs: REQ-0015

## US-0014-0015: Warn on dangling TRD source_refs

As a QFAI user, I want `qfai validate` to emit a WARNING when a TRD-XX axis's `source_refs` references an entry that does not exist in 04_Sources.md, so that I can clean up dangling source references without blocking progress.

- Refs: REQ-0015

## US-0014-0016: Warn when visual Trend categories have no derived visual axis

As a QFAI user, I want `qfai validate` to emit a WARNING when 04_Sources.md contains visual-category Trend Scan entries but 21_design_eval_trend_derived.md has no visual evaluation axis, so that visual trends are not silently dropped from the evaluation model.

- Refs: REQ-0015

## US-0014-0017: Require uiux/12_design_system.md on UI-bearing packs

As a QFAI user, I want `qfai validate` to fail with ERROR when a UI-bearing discussion pack lacks `uiux/12_design_system.md`, so that the design system SSOT is never missing for UI work.

- Refs: REQ-0016

## US-0014-0018: Require non-empty required sections in 12_design_system.md

As a QFAI user, I want `qfai validate` to fail with ERROR when `uiux/12_design_system.md` is missing non-empty content in any of Visual Theme, Color Palette, or Do's and Don'ts sections, so that the design system is usable downstream by prototyping.

- Refs: REQ-0016

## US-0014-0019: Require designSystemCompliance score in prototyping evidence

As a QFAI user, I want `qfai validate` to fail (ERROR under UI-bearing + 12_design_system.md exists + full-harness, WARNING otherwise) when `prototyping.json.scoringTrace` omits a `designSystemCompliance` score, so that design system compliance is always evidenced in prototyping output.

- Refs: REQ-0016
