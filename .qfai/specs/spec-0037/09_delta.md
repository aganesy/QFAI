# 09 Delta

## Change Summary

- Change ID: DELTA-S37-001
- Date: 2026-03-30
- Primary: spec-0037 initial creation
- Tags: v1.7.8, ssot-unification, migration, reviewer-extension, docs-normalization, non-ui-safety
- Summary: Initial spec creation for SSOT Unification & Migration (CAP-0037)

## Rationale

- Reviewer templates need taste/trend reflection evaluation items for new discussion artifact quality
- Migration path needed to prevent validator strengthening from breaking existing adopter packs
- Feature maturity vocabulary must be consistent across all docs to avoid contradictory states
- Non-UI safety is cross-cutting: all new validators must guard against UI-bearing fires on non-UI projects

## Candidates Considered

1. Full anti-preference traceability across all flows (v1.7.8)
2. Limited anti-preference traceability: taste -> axes -> review (adopted)

## Adopted

- Adopted: Limited anti-preference traceability (taste -> axes -> review, 3 points)
- Why: Full flow traceability is scope-excessive for v1.7.8; 3-point coverage addresses highest-value checkpoints (SD-0037-002, AD-007)
- Evidence: discussion-20260330035428071

## Rejected

- Candidate: Full anti-preference traceability across all flows
- ID: RJ-004
- Reason: Scope excessive for v1.7.8; taste -> axes -> review covers the critical checkpoints
- DO NOT: v1.7.8 で taste -> axes -> review 以上の anti-preference traceability を要求しない
- Temptation: 完全な全フロー横断 traceability を一度に実現したい

## Impact

- Affects: packages/qfai/assets/uix-rev/*, validators/*, README.md, CHANGELOG.md, steering docs
- Validation: qfai validate pass, fixture tests for all TC-0037-* cases

## Follow-ups

- None (all OQs resolved at discussion level)
