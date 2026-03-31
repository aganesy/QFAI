# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0006 新規作成（旧 spec-0004 の統合）
- Tags: doctor, diagnostics, consolidation

## Migration Record

| Old Spec  | Title        | Key Changes                                                    |
| --------- | ------------ | -------------------------------------------------------------- |
| spec-0004 | qfai doctor  | Core functionality retained. IDs renumbered to 0006-XXXX. --out and root auto-discovery added as explicit requirements |

## Outdated Content Removed

- 旧 spec-0004 の実装詳細（個別チェック項目のリスト）は core/doctor.ts に委譲されるため spec レベルでは概要にとどめた

## Adopted

- Adopted: 旧 spec-0004 を spec-0006 として再番号付け
- Why: v2.0 のスペック番号体系（CAP-0006）に合わせるため

## Rejected

- Candidate: 旧番号（spec-0004）を維持する
- Reason: 新番号体系への統一
- DO NOT: 旧 spec-0004 の番号で参照を残さないこと
- Temptation: 旧番号維持は移行コストが低いが、体系の一貫性を損なう
