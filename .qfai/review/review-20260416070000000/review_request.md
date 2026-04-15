# Review Request

## Scope

- scope: `spec-0012`
- layer: `sdd`
- version: `v1.7.15-rev7`
- review-pack: `review-20260416070000000`
- discussion-pack: `discussion-20260415203030886`

## Target Files

- `.qfai/specs/spec-0012/01_Spec.md`
- `.qfai/specs/spec-0012/02_User-stories.md` (US-0056..0062 追加)
- `.qfai/specs/spec-0012/03_Acceptance-Criteria.md` (AC-0056..0075 追加)
- `.qfai/specs/spec-0012/04_Business-Rules.md` (BR-0092..0098 追加)
- `.qfai/specs/spec-0012/05_Examples.md` (EX-0109..0128 追加)
- `.qfai/specs/spec-0012/06_Test-Cases.md` (TC-0173..0197 追加)
- `.qfai/specs/spec-0012/07_Decisions.md` (DR-0041..0045 追加)
- `.qfai/specs/spec-0012/08_Open-questions.md` (OQ-0001..0005 解決記録追加)
- `.qfai/specs/spec-0012/09_delta.md` (v1.7.15 rev7 Contract Gap Closure セクション追加)
- `.qfai/specs/spec-0012/10_Plan.md` (v1.7.15 rev7 Implementation Strategy 追加)
- `.qfai/specs/_policies/05_Contracts.md` (v1.7.15 rev7 Contract Posture 追加)
- `.qfai/specs/_policies/10_delta.md` (rev7 エントリ追加)
- `.qfai/assistant/steering/manifest.md` (discussion-20260415203030886 参照追加)

## Review Focus

- v1.7.15 rev7 の 7 workstream (WS-1..WS-7) 閉合が US/AC/BR/EX/TC トレーサビリティチェーンで正確に反映されているか
- runtime API 契約変更の一貫性（WS-1: CalibrationPack upstream, FullHarnessRequest）
- エラー分類設計（WS-5: 6 distinct error classes）
- バリデーター設計（WS-4: 実パック比較, ヒューリスティック除去）
- backward compatibility 放棄の明示（WS-6: scalar calibration field 削除）
- OQ-0001..0005 の DR-0041..0045 への反映正確性
- validate gate: error=52 のうち 52 件すべてが pre-existing（新規 error=0）

## Validate Gate Summary

- コマンド: `qfai validate --fail-on error --format github`
- ログ: `.qfai/report/validate.log`
- 結果: error=52 warning=75 info=3
- 新規 error: **0**（all 52 pre-existing; confirmed by HEAD diff check）
- spec-0012 QFAI-COV-201/202/203/204/205/206: **0**
- spec-0012 QFAI-ATDD-101/102/103/111/112/113/121/122: out of SDD scope

## Required Reviewers

Routing profile: `default` (qfai-sdd)

- `completion-reviewer` (常設: always required)
- `architecture-reviewer` (条件付き: runtime API 契約, エラー分類, パック解決アーキテクチャが影響範囲)
- `qa-gatekeeper` (条件付き: validate gate, coverage, prototyping evidence が影響範囲)
- `product-surface-reviewer` (スキップ: ui_bearing = false, non-ui spec)

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
