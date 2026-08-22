# 07 Decisions

## Decisions

8 items.

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
- Status: RE-OPENED — DR-0003-0008 が本決定を置き換える。静的配置前提の実装・レビューは DR-0003-0008 を参照すること

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

### DR-0003-0008: Codex サブエージェント TOML を init で自動生成する (RE-OPEN of DR-0003-0003 / \_policies DR-0030)

- Decision: `.codex/agents/<name>.toml` を `qfai init` が canonical agent markdown + `assistant/manifest/agent-catalog.yml#agents[].kind` から生成する。生成規約は `assistant/agents/**` と同一 — plain run は create-only、`--force` で再生成し、roster を外れた生成物は `--force` で prune する
- Context: DR-0003-0003 / DR-0030 は「静的配置 + 手動管理」を採用したが、その前提は「配布物が `.codex/agents/` を含む」ことだった。実際には `packages/qfai/assets/init/` に `.codex/agents/` は存在せず、`qfai init` を実行したプロジェクトは Claude / Copilot の agent wrapper だけを受け取り Codex は空のままだった。canonical agent の修正は symlink 経由で 2 統合に即時到達し、3 つ目には永久に到達しない
- Rationale:
  - TOML は symlink にできない（body を `developer_instructions` 文字列へ escape する必要がある）ため、「静的配置」は「手動同期」と同義であり、リポジトリ外では同期する主体が存在しない
  - 生成側に寄せることで canonical markdown が唯一の SSOT になり、3 統合の drift が構造的に消える
  - DR-0030 が挙げた「変換ロジックの複雑度」は `packages/qfai/src/core/codexAgentToml.ts` に閉じ込め、init.ts 側は step 6 の呼び出しのみとする
- Rejected: 配布 asset に `.codex/agents/*.toml` を静的同梱する（DR-0030 の原案を配布物まで延長する）
  - DO NOT: canonical markdown と TOML の二重管理を配布物へ持ち込まない。Temptation: 生成ロジックを書かずに済ませたい
  - Why rejected: 同梱 TOML は canonical markdown の snapshot であり、プロジェクト側で agent を追加・改稿した瞬間に古くなる。`--force` が再生成しない限り Codex だけが取り残される構造は解消しない
- Scope: 本リポジトリの `.codex/agents/*.toml` も本決定以降は生成物として扱う（`packages/qfai/tests/integration/codexAgentWrappers.test.ts` が generator 出力との byte 一致を検証する）
- Coverage: AC-0003-0025 / TC-0003-0027 / TDD-0027
