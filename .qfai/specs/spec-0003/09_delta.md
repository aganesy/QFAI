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

## v1.7.18 (2026-04-19) — Gitignore Managed Block Formalization and review-\*/ default-ignore

- adopted: REQ-0016（ルート `.gitignore` 管理ブロック追記）と REQ-0017（レガシー行自動移行）を spec-0003 に追加。US-0003-0015, AC-0003-0015/0016, BR-0003-0013/0014, EX-0003-0016/0017, TC-0003-0018/0019/0020, DR-0003-0007 を新規登録
- adopted: 管理ブロックから `!.qfai/review/review-*/` と `!.qfai/review/review-*/**` を除去し、`review-*/` 配下をデフォルトで gitignore 対象とする
- adopted: `QFAI_GITIGNORE_LEGACY_LINES` による旧ブロックからの自動 migration ロジックを追加（`removeManagedBlock` を set-based matching に変更し、冪等性の判定にレガシー行の不在も条件に追加）
- rationale: 従来 spec-0003 は `.gitignore` 追記挙動を明文化しておらず、実装と spec の traceability gap が存在した。今回の review-\*/ default-ignore 変更と合わせて REQ/AC/BR/EX/TC を一括登録し、spec-code 整合性を回復
- impact:
  - `_policies/07_Constraints.md` の OC-03 を `.qfai/evidence/` 単独から `.qfai/report/*` + `.qfai/evidence/*` + `.qfai/review/review-*/` + `.qfai/discussion/discussion-*/` を含む範囲に拡張
  - `_policies/06_Glossary.md` の Review Pack 定義に「default gitignore」の注記を追加
  - テストは `packages/qfai/tests/cli/init.test.ts` に 2 ケース追加済み（legacy migration, review-\*/ ignore）
- migration: v1.7.17 以前の managed block を持つプロジェクトは `qfai init` 再実行で自動的に新形式へ移行。既コミット済みの `review-*/` を untrack したい場合は `git rm -r --cached .qfai/review/review-*/` を別途実行

## Triage

| Source                                                                                                       | Subject                                                                                                                                                                        | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018, NFR-0001, NFR-0002 (CHG-003) | `qfai init` で新 layer tree を seed、project-root `.qfai/steering/` を seed、`--upgrade-assistant-tree` flag を実装、migration memo を author、`assistantPaths.ts` SSOT を参照 | spec-0003     | UPDATE    | APPEND | pin-implied | Primary capability owner (CAP-0003)。subject-token overlap (`init`, `seed`, `assistant`)。`packages/qfai/src/cli/commands/init.ts` が直接実装する。 |

## CHG-003 (v1.9.0) — Assistant-layer Recut + Work-log Surface Seed

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/qfai-init.md` (CLI-INIT、Contract Index)、`.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- New REQs (to be appended to `01_Spec.md#Relevant Requirements` in this CHG):
  - REQ-0018: 4-layer asset-tree seeding (`constitution/`, `manifest/`, `catalog/`, `process/`)
  - REQ-0019: project-root `.qfai/steering/` seeding (`README.md` + `.gitkeep` + `_templates/entry.md`); user-authored entries preserved on reinit
  - REQ-0020: `qfai init --upgrade-assistant-tree` one-shot migration helper; user edits preserved via `W-USER-EDIT-PRESERVED`
  - REQ-0021: migration memo authored at `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` (immutable after commit per OC-53)
  - REQ-0022: `assistantPaths.ts` SSOT module is the sole producer of distributed assistant-tree path strings consumed by `init`; hard-coded literals lint-rejected (NFR-0001)
  - REQ-0023: backwards-compatibility — old-layout files remain readable for exactly one minor release window (NFR-0002); sunset version named in `D-DEPRECATED-PATH` warning text
- New US (CHG-003 v1.9.0 — fully landed in 02_User-stories.md):
  - US-0003-0016: 4-layer asset-tree seed + work-log surface seed (REQ-0018, REQ-0019)
  - US-0003-0017: `--upgrade-assistant-tree` migration helper (REQ-0020)
  - US-0003-0018: migration memo authoring (REQ-0021)
  - US-0003-0019: assistantPaths.ts SSOT module (REQ-0022)
  - US-0003-0020: legacy layout backwards-compatibility window (REQ-0023)
- Cascade:
  - spec-0004 references `assistantPaths.ts` for validate-side path strings (companion row in spec-0004 09_delta)
  - downstream skill specs (spec-0008/0010/0011/0012/0013/0014/0016) consume the new layer paths via `project_memory:` block (companion rows in each spec)
- Out-of-scope (this spec): validation of frontmatter schema (spec-0004); Reviewer-Gate findings (spec-0015); skill-side `project_memory:` block (each skill spec)
- Implementation-phase 詳細 US/AC/BR/EX/TC は同じ v1.9.0 PR (#209) の per-spec SDD pass で append 済み — US-0003-0016..0020, AC-0003-0017..0024, BR-0003-0015..0020, EX-0003-0018..0023, TC-0003-0021..0026 すべて 02..06 に追加完了。
- Classifier routing contract (REQ-0020, `classifyLegacySteeringEntry`): the migration helper routes legacy entries using **exact basename (stem) Set membership** for catalog / manifest / constitution layers, and **exact path-segment** matching (`segments.includes("migrations")` + `segments[0] === "process"`) for the process layer. User docs whose filenames contain layer-relevant tokens (e.g. `agent-routing-notes.md`, `review-gate-overview.md`, `foo-migration-bar.md`, `quality-gate-summary.md`) are NOT mis-routed; previously the substring `.includes()` form would have pulled them into the canonical layers. This is a behavior change from the v1.9.0-alpha implementation; the unknown-stem fallback remains `catalog/` so unrouted user docs still land in a defensible default layer.
- Source: REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018, NFR-0001, NFR-0002
