# 04 Business Rules

## BR-0010-0001: Fixed Output Path

- AC-Refs: AC-0010-0001

- Discussion pack output path is fixed to `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.
- Timestamp format is `YYYYMMDDhhmmssSSS` (3-digit milliseconds).

## BR-0010-0002: OQ-Driven Exit

- AC-Refs: AC-0010-0002

- Discussion completion requires `Disposition: open` count to be zero in `11_OQ-Register.md`.
- `deferred` is allowed only when required metadata is complete in `13_Deferred.md`.

## BR-0010-0003: Mermaid Fence Rule

- AC-Refs: AC-0010-0003

- Mermaid syntax MUST be in ` ```mermaid ` fences only. No `text` or language-less fences.

## BR-0010-0004: UI-Bearing Sidecar All-or-Nothing

- AC-Refs: AC-0010-0004

- When UI-bearing is detected, all 11 uiux/ sidecar files must be generated. Partial generation is forbidden.
- When non-ui is detected, skip uiux/ sidecar generation entirely.

## BR-0010-0005: Devils-Advocate Gate

- AC-Refs: AC-0010-0005

- devils-advocate FAIL must include a concrete alternative proposal. Bare negation FAIL triggers re-judgment.
- 3 consecutive FAILs trigger advisory demotion (current review cycle only).

## BR-0010-0006: Pattern-Doubler Gate

- AC-Refs: AC-0010-0006

- Each pattern proposed by pattern-doubler must include rationale.
- N/A is default when target artifact has no ID-bearing items.

## BR-0010-0007: Discussion Artifacts Are Not Spec SSOT

- AC-Refs: AC-0010-0007

- Discussion artifacts are logs/rationale and must not duplicate finalized spec content.

## BR-0010-0008: Competitive Reference Minimum

- AC-Refs: AC-0010-0008

- UI-bearing packs require 3+ competitive references with adopted/rejected/local_translation fields. Placeholder values (TBD, N/A, TODO, empty) are treated as missing.
