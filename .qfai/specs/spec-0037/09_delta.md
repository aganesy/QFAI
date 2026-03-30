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

- Affects: packages/qfai/assets/uix-rev/_, validators/_, README.md, CHANGELOG.md, steering docs
- Validation: qfai validate pass, fixture tests for all TC-0037-\* cases

## Follow-ups

- None (all OQs resolved at discussion level)

---

## Change Summary (DELTA-S37-002)

- Change ID: DELTA-S37-002
- Date: 2026-03-31
- Primary: v1.7.11 WS-J — docs/tests normalization
- Tags: v1.7.11, docs-normalization, test-fixtures, canonical-vocabulary
- Summary: v1.7.11 WS-J — docs/tests normalization (US-0037-0005, AC-0037-0015..0017, BR-0037-0017..0020, EX-0037-0019..0025, TC-0037-0023..0029)

## Rationale (DELTA-S37-002)

- ドキュメントとテスト全体で maturity vocabulary が不統一であり、implemented/partial/deferred の canonical 用語に正規化する必要がある
- テストフィクスチャを 3-layer expectations に更新し、canonical model との整合性を確保する

## Candidates Considered (DELTA-S37-002)

1. Canonical maturity vocabulary (implemented/partial/deferred), test fixtures updated to 3-layer expectations (adopted)
2. Keep mixed vocabulary (rejected)

## Adopted (DELTA-S37-002)

- Adopted: Canonical maturity vocabulary (implemented/partial/deferred), test fixtures updated to 3-layer expectations
- Why: 一貫した用語により、ドキュメント間の状態比較が自動化可能になり、混乱・矛盾が排除される

## Rejected (DELTA-S37-002)

- Candidate: Keep mixed vocabulary
- Reason: 不統一な状態用語はドキュメント間で矛盾を生み、自動バリデーションが不可能になる
- DO NOT: use inconsistent state terms across documents
- Temptation: update only new docs

## Impact (DELTA-S37-002)

- Affects: README.md, CHANGELOG.md, steering docs, test fixtures, spec-0037/02〜06 (US-0037-0005, AC-0037-0015..0017, BR-0037-0017..0020, EX-0037-0019..0025, TC-0037-0023..0029)
- Validation: qfai validate pass, fixture tests for all TC-0037-* cases

## Follow-ups (DELTA-S37-002)

- 既存ドキュメントの vocabulary 正規化パス実施
- Owner: aganesy
- Due: v1.7.11 release
