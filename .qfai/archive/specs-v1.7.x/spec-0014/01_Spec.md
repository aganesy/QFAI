# spec-0014: 実装フェーズ統一 (qfai-implement)

## Parent

CAP-0014

## Version

v1.6.0

## Summary

旧3つの TDD スキル（qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor）を廃止し、単一の `/qfai-implement` エントリポイントで厳密な TDD マイクロサイクル（Red→Green→Refactor）を実行する。`test-list.md` 実行台帳で進捗管理し、Phase 1 バリデータで構造検証する。

## Scope

### In Scope

1. `qfai-implement` スキル新規作成（埋め込み TDD マイクロサイクル）
2. 旧3スキル完全削除（非推奨ではなく廃止）
3. `test-list.md` 実行台帳導入（`.qfai/specs/spec-XXXX/tdd/test-list.md`）
4. Phase 1 バリデータ（構造検証: ファイル存在、テーブル構造、必須列、ステータス列挙、TC参照）
5. ラッパー同期（.agents, .claude, .codex）
6. オーファン参照クリーンアップ

### Out of Scope

- TC カバレッジハードニング（v1.6.1）
- Exception + DR-ID ハードニング（v1.6.1）
- サブエージェントロスター正式化（v1.6.2）
- エビデンスコントラクトハードニング（v1.6.2）
- 並列ルールハードニング（v1.6.2）

## Applicable NFR (copy-down from \_policies)

| NFR-ID   | Target                                  |
| -------- | --------------------------------------- |
| NFR-0001 | バリデータ実行 < 5秒（単一spec）        |
| NFR-0002 | 旧スキル参照 grep ヒット = 0            |
| NFR-0003 | Assets テストが旧スキル参照再導入を検出 |
| NFR-0004 | 非実装スキルのテストが変更なしでパス    |
| NFR-0005 | 全変更が単一PRでアトミック配信          |

## Applicable Requirements (copy-down)

| REQ-ID   | Title                                | Priority |
| -------- | ------------------------------------ | -------- |
| REQ-0001 | Single implementation entry point    | Must     |
| REQ-0002 | Strict TDD micro-cycle               | Must     |
| REQ-0003 | test-list.md introduction            | Must     |
| REQ-0004 | Phase 1 validator                    | Must     |
| REQ-0005 | Error codes                          | Must     |
| REQ-0006 | Skill body keywords                  | Must     |
| REQ-0007 | Wrapper synchronization              | Must     |
| REQ-0008 | Orphan reference elimination         | Must     |
| REQ-0009 | Init template for test-list.md       | Must     |
| REQ-0010 | Workflow documentation update        | Must     |
| REQ-0011 | spec_required_files.json update      | Must     |
| REQ-0012 | Sub-agent role documentation         | Should   |
| REQ-0013 | Parallelization policy documentation | Should   |

## Escalation Hook

For cross-cutting policies, constraints, and glossary, refer to `_policies/`.

## Evidence Summary

- Discussion: `.qfai/discussion/discussion-20260317102145554/`
- Review: PASS (Cycle 1, 10 PASS / 3 N/A / 0 FAIL)
