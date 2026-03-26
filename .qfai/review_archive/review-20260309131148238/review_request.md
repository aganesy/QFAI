# Review Request

## Meta

- Skill: `/qfai-sdd`
- Target scope: `sdd`
- Created: 2026-03-09T13:11:48Z
- Discussion source: `.qfai/discussion/discussion-20260309025837892`

## Review Target

- `.qfai/specs/spec-0007/` (CAP-0007: Skill Orchestration)
- `.qfai/specs/spec-0008/` (CAP-0008: Agent Delegation)
- `.qfai/specs/spec-0009/` (CAP-0009: Traceability & Spec Architecture)
- `.qfai/specs/spec-0010/` (CAP-0010: Steering & Governance)
- `.qfai/specs/_policies/03_Capabilities.md` (CAP-0007~0010 追加)
- `.qfai/specs/_policies/04_Business-Flow.md` (Canonical Workflow Stages 追加)
- `.qfai/specs/_policies/06_Glossary.md` (15+ 用語追加)
- `.qfai/specs/_policies/10_delta.md` (adopted/rejected 記録)
- `.qfai/report/validate.log`

## Validation Status

- `qfai validate`: error=26 (all pre-existing), warning=21, info=3
- New-spec-specific errors: 0 (all resolved)
- Pre-existing errors: E_ID_INVALID_FORMAT (AC-Refs/BR-ID headers x10), QFAI-COV-201 x10, QFAI-REVIEW-007 x3, QFAI-PROT-101 x1, QFAI-ATDD-111/112 x2

## Summary of Changes

- 4 new spec directories (spec-0007~0010) with 10 files each
- \_policies updated: 03_Capabilities, 04_Business-Flow, 06_Glossary, 10_delta
- Framework design specs documenting Assistant Framework (not CLI commands)
- TC level: L-struct (structural validation via qfai validate)
- SSOT principle: specs record design intent, SKILL.md/agent definitions remain runtime SSOT
