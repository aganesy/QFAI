# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0004 新規作成（旧 spec-0002 の統合）
- Tags: validate, traceability, waiver, consolidation

## Migration Record

| Old Spec  | Title         | Key Changes                                                                                                                                           |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| spec-0002 | qfai validate | Core functionality retained. IDs renumbered from 0002-XXXX to 0004-XXXX. US-0002-0015 (canonical entrypoint wiring) retained as implementation detail |

## Outdated Content Removed

- 旧 spec-0002 の AC-0002-0029, AC-0002-0030（canonical entrypoint / deprecation wrapper）は実装の内部詳細であり spec レベルのユーザーストーリーとしては除外
- phase guard を US-0004-0015 として明示化（旧 spec では暗黙的だった）

## Adopted

- Adopted: 旧 spec-0002 を spec-0004 として再番号付け
- Why: v2.0 のスペック番号体系に合わせるため（CLI コマンドごとに連番）

## Rejected

- Candidate: 旧番号（spec-0002）を維持する
- Reason: 新番号体系は CAP-0003..CAP-0007 に揃えるため変更が必要
- DO NOT: 旧 spec-0002 の番号でテスト/コード内の参照を残さないこと
- Temptation: 旧番号維持は変更が少ないが、番号体系の不整合が将来の混乱を招く
