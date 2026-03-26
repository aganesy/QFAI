# Review Request

## Target

- kind: sdd
- pack: spec-0011
- layer: sdd
- review-pack: review-20260314062000000
- description: Spec Diff Protocol (SDP) - CAP-0011

## Scope

spec-0011 SDD artifacts full review. Covers the complete spec pack (01_Spec through 10_Plan) defining the Spec Diff Protocol: 3-source preflight diff detection, Implementation State Analysis, incremental mode for /qfai-atdd and /qfai-prototyping, evidence Diff Context schema extension.

## Files Under Review

- `.qfai/specs/spec-0011/01_Spec.md`
- `.qfai/specs/spec-0011/02_User-stories.md`
- `.qfai/specs/spec-0011/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0011/04_Business-Rules.md`
- `.qfai/specs/spec-0011/05_Examples.md`
- `.qfai/specs/spec-0011/06_Test-Cases.md`
- `.qfai/specs/spec-0011/07_Decisions.md`
- `.qfai/specs/spec-0011/08_Open-questions.md`
- `.qfai/specs/spec-0011/09_delta.md`
- `.qfai/specs/spec-0011/10_Plan.md`
- `.qfai/specs/_policies/08_Decisions.md` (DR-0006 through DR-0011)
- `.qfai/report/validate.log`

## Discussion Source

- discussion-20260313143000000

## Validate Result

- 34 errors, ALL pre-existing (no new errors introduced by spec-0011)
- Pre-existing categories: E_ID_INVALID_FORMAT (table header parsing), QFAI-COV-201 (AC-to-TC validator limitation), QFAI-REVIEW-007 (old summary.json schemas), QFAI-PROT-101 (prototyping evidence), QFAI-ATDD-111/112 (test annotations not yet implemented), QFAI-SKILLS-001 (skill file modifications)

## Review Focus

1. Spec consistency: objectives/scope/non-goals align with US/AC/BR/EX/TC
2. Decision observability: delta/decisions/rejected have "why" rationale + DO NOT/Temptation
3. Contracts: N/A for this spec (CLI tool, no API/DB/UI contracts - confirmed by DR-0008)
4. Traceability: spec to test mapping coverage, boundary/negative/permission/state perspectives

## Key Decisions to Verify

- DR-0006: Multi-source diff (not git-only)
- DR-0007: verify excluded from SDP
- DR-0008: SKILL.md-only, no TypeScript changes
- DR-0009: Heuristic stale detection (not structural analysis)
- DR-0010: Stale only for Behavior/Initial primary
- DR-0011: Policy changes affect all specs (no auto-narrowing)
