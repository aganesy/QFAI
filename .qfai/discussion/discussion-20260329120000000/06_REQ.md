# 06 REQ (Functional Requirements)

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Requirements

### REQ-0001: UIX-VAL Validator Family Registration

The system SHALL register a new `UIX-VAL-*` validator family in `validate.ts` following the existing async pattern `(root, config) => Promise<Issue[]>`.

- Source: SRC-0001 (Section 2.1), SRC-0005
- Priority: Must

### REQ-0002: UI-Bearing Detection Consistency

The system SHALL use a single, deterministic UI-bearing detection function shared by all UIX-VAL-* validators. The detection function SHALL use the following signal set:

**Positive signals** (any one triggers UI-bearing classification):
- `<style>` tags in markdown content (outside `<code>` fences)
- `<div>` tags in markdown content (outside `<code>` fences)
- Mermaid `stateDiagram` or screen-flow-labeled `flowchart` blocks
- `uiux/` sidecar directory presence
- Screen contract YAML files

**Negative overrides** (suppress false positives):
- HTML tags inside fenced code blocks (` ``` `) are excluded
- HTML tags inside inline code (`` ` ``) are excluded
- Mermaid `flowchart` without screen-flow labels (e.g., architecture diagrams) are excluded

Each positive signal and negative override SHALL have a dedicated fixture test.

- Source: SRC-0001 (Section 2.1), SRC-0012
- Priority: Must

### REQ-0003: Sidecar Artifact Presence Validation

The system SHALL validate the presence of the `uiux/` sidecar directory for UI-bearing packs and emit `UIX-VAL-SIDECAR-MISSING` when absent.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0004: Implementation Strategy Completeness

The system SHALL validate that implementation strategy artifacts contain required fields (approach, rationale, constraints) and emit `UIX-VAL-STRATEGY-INCOMPLETE` when fields are missing or empty. For critical narrative fields (`rationale`, `approach`), the validator SHALL enforce a minimum content threshold of 20 characters to prevent trivially empty strings (e.g., single-word entries) from passing validation. This threshold keeps the check deterministic while raising the floor above obviously insufficient content.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0005: Scoring Axes Completeness

The system SHALL validate that scoring-ready axes include source translation for trend-derived axes and emit an error when translation is missing.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0006: Aggregate Scoring Completeness

The system SHALL validate that aggregate scoring rules are complete (weights, normalization, threshold) and emit an error when incomplete.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0007: Option Comparison and Anchor Presence

The system SHALL validate that UI-bearing packs contain option comparison with at least 2 options and a selected anchor, emitting errors when missing.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0008: Screen Contract Minimum Structure

The system SHALL validate that screen contracts include states, outcomes, and transitions fields, emitting an error when any are missing.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0009: OQ Closure Readiness

The system SHALL validate that no critical OQ remains open in packs intended for downstream consumption, emitting an error for blocking OQs.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0010: Prototyping Mode Declaration Consistency

The system SHALL validate that prototyping mode declarations are consistent between spec and evidence artifacts.

- Source: SRC-0001 (Section 2.1)
- Priority: Should

### REQ-0011: Visual-Review Backend Expectation Declaration

The system SHALL validate that visual-review backend expectations are declared when render critique is enabled.

- Source: SRC-0001 (Section 2.1)
- Priority: Should

### REQ-0012: Static/Runtime Boundary Protection

The system SHALL ensure that UIX-VAL-* validators do not include runtime-dependent checks (browser, network, rendering), keeping the boundary between static validation and runtime evidence clean.

- Source: SRC-0001 (Section 2.1)
- Priority: Must

### REQ-0013: UIX-REV Semantic Review Prompts

The system SHALL provide reviewer prompt templates for UIX-REV-* checks covering strategy selection, axis overlap, trend translation, product-specificity, anchor weakness, and generic fallback risk.

- Source: SRC-0001 (Section 2.2)
- Priority: Must

### REQ-0014: Reviewer Recommendation Output

The system SHALL produce `accept / refine / pivot` recommendations from UIX-REV-* checks.

- Source: SRC-0001 (Section 2.2)
- Priority: Must

### REQ-0015: Rule-by-Rule Fixture Tests

The system SHALL include pass and fail fixture tests for each UIX-VAL-* rule.

- Source: SRC-0001 (Section 2.3)
- Priority: Must

### REQ-0016: Stale Asset Detection

The system SHALL detect stale sidecar assets (missing or outdated template versions) and emit warnings with migration guidance.

- Source: SRC-0001 (Section 2.3, 2.4)
- Priority: Must

### REQ-0017: Non-UI Project Immunity

The system SHALL skip all UIX-VAL-* and UIX-REV-* checks for non-UI projects without emitting any issues.

- Source: SRC-0001 (Section 2.1), US-D005
- Priority: Must

### REQ-0018: Actionable Report Output

The system SHALL include rule ID, file path, severity, description, and action (fix suggestion) in every validation issue.

- Source: SRC-0001 (Section 2.3), US-D003
- Priority: Must

### REQ-0019: Verify-Pack Test Coverage

The system SHALL include verify-pack tests that validate the end-to-end redesign path from sidecar creation through validation.

- Source: SRC-0001 (Section 2.3)
- Priority: Must

### REQ-0020: Migration Guidance for Legacy Projects

The system SHALL detect missing `uiux/` sidecar in legacy projects and provide step-by-step migration instructions.

- Source: SRC-0001 (Section 2.4)
- Priority: Must

### REQ-0021: Upgrade Sequencing Definition

The system SHALL define the recommended upgrade sequence for projects migrating from pre-v1.7.3 to v1.7.4.

- Source: SRC-0001 (Section 2.4)
- Priority: Should

### REQ-0022: Reviewer Prompt Structure-Level Tests

The system SHALL include tests verifying reviewer prompt template structure (required sections, expected output format) without testing semantic quality.

- Source: SRC-0001 (Section 2.3)
- Priority: Should

### REQ-0023: CHANGELOG Test Count Correction (PR #181 Carry-over)

The CHANGELOG entry for v1.7.3 SHALL be corrected to reflect the actual test count (26 tests, not 25). This addresses the unreplied NIT from PR #181 review comment #3005345979.

- Source: PR #181 review comment (CHANGELOG.md, NIT)
- Priority: Must

## Summary

| Priority | Count |
| -------- | ----- |
| Must     | 18    |
| Should   | 5     |
| Total    | 23    |
