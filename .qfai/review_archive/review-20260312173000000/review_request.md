# Review Request

## Meta

- Skill: `/qfai-sdd`
- Target scope: `sdd`
- Created: 2026-03-12T17:30:00Z
- Discussion source: `.qfai/discussion/discussion-20260312143000000`

## Review Target

- `.qfai/specs/spec-0001/` (CAP-0001: qfai init) — UPDATE
- `.qfai/specs/_policies/06_Glossary.md` (symlink 関連 10 用語追加)
- `.qfai/specs/_policies/07_Constraints.md` (TC-11〜TC-14, OC-06〜OC-07 追加)
- `.qfai/specs/_policies/08_Decisions.md` (DR-0001〜DR-0005 追加)
- `.qfai/specs/_policies/10_delta.md` (adopted 6 件 / rejected 5 件)
- `.qfai/report/validate.log`
- `.qfai/report/specs-coverage/spec-0001.md`

## Validation Status

- `qfai validate`: error=30 (all pre-existing), warning=21, info=3
- spec-0001 specific new errors: 0 (TRACE_SHARED_SCOPE_VIOLATION fixed)
- Pre-existing errors: QFAI-SKILLS-001 x1, E_ID_INVALID_FORMAT x10, QFAI-REVIEW-007 x5, QFAI-PROT-101 x1, QFAI-COV-201 x10, QFAI-ATDD-111/112 x2

## Summary of Changes

- spec-0001 updated with symlink architecture migration (discussion-20260312143000000)
- New user stories: US-0001-0007〜0010 (symlink-based skill/agent integration)
- New acceptance criteria: AC-0001-0015〜0025 (11 items)
- Updated acceptance criteria: AC-0001-0010, AC-0001-0011 (symlink 方式に変更)
- New business rules: BR-0001-0016〜0030 (15 items)
- Updated business rules: BR-0001-0010, BR-0001-0011 (symlink 方式に変更)
- New examples: EX-0001-0017〜0026 (10 items)
- New test cases: TC-0001-0019〜0032 (14 items, all L3)
- New plan modules: symlinks.ts, gitconfig.ts, prune.ts, copilot.ts
- New delta: DELTA-0002 (symlink architecture adoption, 2 rejected options with DO NOT/Temptation)
- \_policies updated: Glossary (10 terms), Constraints (6 items), Decisions (5 DRs), delta (11 entries)
