# 07 Decisions

## Decisions

7 items.

### DR-0003-0001: symlink ベースの統合方式

- 旧 commands/prompts のファイルコピー方式を廃止し、symlink ベースに移行した
- Why: skill 更新時にラッパー更新が不要（NFR-S0001）
- See also: ../\_policies/08_Decisions.md

### DR-0003-0002: instructions の create-only 保護

- `--force` を付けても `.github/instructions/` ファイルは上書きしない
- Why: ユーザーがカスタマイズした instructions を保護するため
- Source: 旧 spec-0017 DR-0022 through DR-0026

### DR-0003-0003: Codex サブエージェントは静的配置

- `.codex/agents/*.toml` は init.ts の自動生成ロジックには含めず、リポジトリに静的配置する
- Why: Codex TOML は手動管理とし、init.ts の複雑性を抑制する
- Source: 旧 spec-0018 DR-0030

### DR-0003-0004: Agent symlink の自動 prune 非対応

- Agent symlink は自動 prune 対象外とする（suffix が統合先ごとに異なるため stale 検出が困難）
- Why: 誤削除リスク回避のため手動削除を要求する

### DR-0003-0005: README.md は通常ファイル維持

- 統合ディレクトリの README.md は symlink 化せず通常ファイルとして配置する
- Why: README は統合先ごとに内容が異なるため

### DR-0003-0007: `.qfai/review/review-*/` を default gitignore に変更 (v1.7.18)

- Decision: `qfai init` が追記する管理ブロックから `!.qfai/review/review-*/` および `!.qfai/review/review-*/**` の negation を削除し、review-pack を default gitignore 対象とする
- Context: 従来は review-pack サブディレクトリのみ `.qfai/review/*` の ignore から除外し、レビュー履歴を git に追跡させていた。一方で `.qfai/evidence/` と `.qfai/report/` は従来から gitignore 対象で、evidence/report を review pack 内へコピー保全する運用（`.qfai/review/review-*/evidence/`）に前提の歪みがあった
- Rationale:
  - 生成成果物を横断的に gitignore する方針に統一することで、リポジトリ肥大と誤コミットを防ぐ（OC-03 参照）
  - review-pack を共有したい場合はプロジェクト側で明示的な negation を追加する二段構造とし、default は保守的（ignore）にする
  - レガシーブロック（v1.7.17 以前）を持つ既存プロジェクトでも再 init で自動的に新形式に移行する（`QFAI_GITIGNORE_LEGACY_LINES` による migration ロジック）
- Source: SSOT は `packages/qfai/src/core/gitignore.ts`（`QFAI_GITIGNORE_BLOCK`, `QFAI_GITIGNORE_REQUIRED_ENTRIES`, `QFAI_GITIGNORE_LEGACY_LINES`）

### DR-0003-0006: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0015 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: init コマンドは tests/cli/init.test.ts で既に広範にカバー済み（空ディレクトリ初期化、冪等性、--force、--dry-run、symlink生成、レガシー退避、instructions配置）。tests/codex/agents.test.ts も TC-0003-0001..0009 をカバー。one-shot GREEN で exception に確定する
