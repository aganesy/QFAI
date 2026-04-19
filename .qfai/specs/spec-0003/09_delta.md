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
- 旧 spec-0018 の TOML ファイル生成詳細（39 ファイル仕様）は旧体系として残し、新体系では 19 consolidated agents の静的 TOML 配布に更新した
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

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: contracts/design/ ディレクトリを init 対象に追加（design contracts 格納用）
- rationale: v1.7.13 で assets/init/.qfai/contracts/design/README.md が追加された実装の反映

## v1.7.18 (2026-04-19) — Gitignore Managed Block Formalization and review-*/ default-ignore

- adopted: REQ-0016（ルート `.gitignore` 管理ブロック追記）と REQ-0017（レガシー行自動移行）を spec-0003 に追加。US-0003-0015, AC-0003-0015/0016, BR-0003-0013/0014, EX-0003-0016/0017, TC-0003-0018/0019/0020, DR-0003-0007 を新規登録
- adopted: 管理ブロックから `!.qfai/review/review-*/` と `!.qfai/review/review-*/**` を除去し、`review-*/` 配下をデフォルトで gitignore 対象とする
- adopted: `QFAI_GITIGNORE_LEGACY_LINES` による旧ブロックからの自動 migration ロジックを追加（`removeManagedBlock` を set-based matching に変更し、冪等性の判定にレガシー行の不在も条件に追加）
- rationale: 従来 spec-0003 は `.gitignore` 追記挙動を明文化しておらず、実装と spec の traceability gap が存在した。今回の review-*/ default-ignore 変更と合わせて REQ/AC/BR/EX/TC を一括登録し、spec-code 整合性を回復
- impact:
  - `_policies/07_Constraints.md` の OC-03 を `.qfai/evidence/` 単独から `.qfai/report/*` + `.qfai/evidence/*` + `.qfai/review/review-*/` + `.qfai/discussion/discussion-*/` を含む範囲に拡張
  - `_policies/06_Glossary.md` の Review Pack 定義に「default gitignore」の注記を追加
  - テストは `packages/qfai/tests/cli/init.test.ts` に 2 ケース追加済み（legacy migration, review-*/ ignore）
- migration: v1.7.17 以前の managed block を持つプロジェクトは `qfai init` 再実行で自動的に新形式へ移行。既コミット済みの `review-*/` を untrack したい場合は `git rm -r --cached .qfai/review/review-*/` を別途実行
