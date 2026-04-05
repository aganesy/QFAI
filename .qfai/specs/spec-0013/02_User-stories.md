# 02 User Stories

## US-0013-0001: Unified SDD Workflow

As a QFAI user, I want a single `/qfai-sdd` command to produce layered spec artifacts (policies + spec-XXXX) from a discussion pack, so that downstream execution skills have complete specifications.

## US-0013-0002: Contract-First Phase

As a QFAI user, I want contracts created/updated before spec slices, so that spec artifacts reference concrete contract definitions.

## US-0013-0003: Discussion-Pack Preflight

As a QFAI user, I want SDD to validate the latest discussion pack and stop if incomplete or has blocking OQs, so that specs are not built on incomplete requirements.

## US-0013-0004: Batch Mode Processing

As a QFAI user, I want no-argument invocation to process all capabilities from `_policies/03_Capabilities.md`, so that multi-spec projects are handled in one run.

## US-0013-0005: Required Edge Enforcement

As a QA engineer, I want US -> AC -> BR -> EX -> TC edge completeness enforced, so that traceability gaps are caught during SDD.

## US-0013-0006: Validate Gate Integration

As a QFAI user, I want `qfai validate --fail-on error` to pass with error=0 before SDD completion, so that spec quality is verified.

## US-0013-0007: Delta Phase with Rejected Guardrails

As a QFAI user, I want `09_delta.md` to include adoption/rejection rationale with DO NOT and Temptation sections, so that rejected options are guarded against reintroduction.

## US-0013-0008: Prototyping Recommendation Preflight

As a QFAI user, I want SDD preflight to validate that prototyping.yaml exists and has a valid schema before allowing SDD to proceed, so that downstream prototyping has a valid mode recommendation.
