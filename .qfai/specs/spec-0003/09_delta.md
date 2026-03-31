# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0003 新規作成（旧 spec-0001, spec-0017, spec-0018 の統合）
- Tags: init, symlink, instructions, codex, consolidation

## Migration Record

This spec consolidates the following archived specs:

| Old Spec  | Title                       | Key Changes                                                                 |
| --------- | --------------------------- | --------------------------------------------------------------------------- |
| spec-0001 | qfai init                   | Core init functionality retained as-is. IDs renumbered to 0003-XXXX         |
| spec-0017 | Copilot Review Instructions | Merged as US-0003-0011..US-0003-0013. create-only protection retained       |
| spec-0018 | Codex Sub-Agent TOML        | TOML files are static assets; init.ts does not auto-generate them (DR-0003) |

## Outdated Content Removed

- 旧 spec-0001 の US-0001-0011..US-0001-0014（マイグレーション/バージョン正規化/内部モジュールドキュメント/カノニカルテンプレート）は未実装のため除外
- 旧 spec-0018 の TOML ファイル生成詳細（39 ファイル仕様）は init.ts のスコープ外のため簡略化
- REQ-0005 は旧「マルチツールラッパー生成」から「マルチツール symlink 統合」に更新（実装と一致）

## Adopted

- Adopted: 旧 3 スペックの統合（1 CAP = 1 spec directory 原則に準拠）
- Why: init コマンドは単一 CLI コマンドであり、CAP-0003 として統合管理する方が保守性が高い
- Evidence: `packages/qfai/src/cli/commands/init.ts` が全機能を単一ファイルで実装している

## Rejected

- Candidate: 旧スペックをそのまま維持（3 スペック体制）
- Reason: 1 CAP = 1 spec directory の原則に反し、init 関連の変更時に 3 スペック間の整合性管理が必要になる
- DO NOT: init コマンドの機能を複数スペックに分割しないこと
- Temptation: 「instructions 配布は独立機能」だが、実装上は init.ts の一部であり分離は不要
