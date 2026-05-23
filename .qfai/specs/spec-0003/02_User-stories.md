# 02 User Stories

## US Catalog

- US-0003-0001: ワークスペース初期化 - qfai init で .qfai/ 構造を生成
- US-0003-0002: 冪等な初期化 - 2回目以降はスキップ + 新規のみ追加
- US-0003-0003: 強制更新 - --force でスキル上書き（skills.local/ 保護）
- US-0003-0004: ドライラン - --dry-run で変更プレビュー
- US-0003-0005: symlink ベースのスキル統合 - 4つの skills/ ディレクトリに directory symlink を配置
- US-0003-0006: Agent symlink 統合 - .claude/agents/ と .github/agents/ にファイル symlink を配置
- US-0003-0007: レガシーファイル退避 - 非推奨ファイル検出・削除
- US-0003-0008: 旧ラッパー prune - commands/prompts 廃止と stale skill ディレクトリの prune
- US-0003-0009: Git symlink 設定 + Windows 対応 - git config 自動設定とクロスプラットフォーム対応
- US-0003-0010: copilot-instructions.md 生成 - Copilot 向けリポジトリ指示ファイル生成
- US-0003-0011: Copilot review instructions 配布 - .github/instructions/ に create-only で配布
- US-0003-0012: instructions の force 無効保護 - --force でも instructions は上書きしない
- US-0003-0013: instructions アクティベーション案内 - 作成時にガイダンスメッセージ表示
- US-0003-0014: README ファイル生成 - 各統合ディレクトリに README.md を通常ファイルとして配置
- US-0003-0015: `.gitignore` 管理ブロック自動追記 (v1.7.18) - `qfai init` 時に QFAI 生成成果物（report/evidence/review-pack/discussion-pack）が自動で gitignore される
- US-0003-0016: 4-layer asset-tree + work-log surface seeding (v1.9.0) - `qfai init` が `.qfai/assistant/{constitution,manifest,catalog,process}/` の 4 層およびプロジェクトルートに `.qfai/steering/` を seed
- US-0003-0017: --upgrade-assistant-tree migration helper (v1.9.0) - 旧 `.qfai/assistant/steering/` レイアウトを 4-layer へ一括移行する flag。ユーザー編集を保全
- US-0003-0018: migration memo authoring (v1.9.0) - migration 実行時に `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` を生成
- US-0003-0019: assistantPaths.ts SSOT module (v1.9.0) - assistant-tree のパス文字列を単一の TypeScript module から供給し、hard-coded literal を排除
- US-0003-0020: 旧 layout backwards-compatibility window (v1.9.0) - 旧 `.qfai/assistant/steering/` を 1 minor release window だけ読み取り可能とし、sunset version を `D-DEPRECATED-PATH` warning で明示

## US-0003-0016: 4-layer asset-tree + work-log surface seeding

- Parent: CAP-0003
- Goal: `qfai init` が新規プロジェクトに対して assistant-tree の 4 層 (`constitution/`, `manifest/`, `catalog/`, `process/`) およびプロジェクトルートの `.qfai/steering/` (AI work-log surface) を seed することで、CHG-003 discussion pack で合意された新しいレイアウトを 1 コマンドで実体化する
- Non-goals: validate-side enforcement (spec-0004 が担当)、frontmatter schema 検証 (spec-0004 担当)、Reviewer-Gate drift findings (spec-0015 担当)
- Notes: REQ-0018 / REQ-0019 を実装する。`assistantPaths.ts` (REQ-0022) を経由してパス文字列を解決すること

## US-0003-0017: --upgrade-assistant-tree migration helper

- Parent: CAP-0003
- Goal: 旧 `.qfai/assistant/steering/` レイアウトを使っているプロジェクトが `qfai init --upgrade-assistant-tree` 1 コマンドで 4-layer 構成へ移行できる。ユーザー編集が含まれるファイルは `W-USER-EDIT-PRESERVED` informational note 付きで保全する
- Non-goals: rollback コマンドの提供、frontmatter schema validation
- Notes: REQ-0020 を実装する。migration は idempotent（既に upgrade 済みの project に対しては no-op で W-USER-EDIT-PRESERVED のみを出す）

## US-0003-0018: migration memo authoring

- Parent: CAP-0003
- Goal: `qfai init --upgrade-assistant-tree` が成功した時点で `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` を author し、移行内容の audit trail を残す
- Non-goals: memo 内容のユーザー編集を許す (memo は OC-53 により commit 後 immutable)
- Notes: REQ-0021 を実装する。memo は commit に含まれることで初めて confirmed 状態となる

## US-0003-0019: assistantPaths.ts SSOT module

- Parent: CAP-0003
- Goal: init / validate / skill body が読む assistant-tree のパス文字列を `packages/qfai/src/core/paths/assistantPaths.ts` の 1 module に集約し、hard-coded string literal を package 全体から排除する。NFR-0001 (consistency) の構造的保証
- Non-goals: 既存の `qfai.config.yaml#paths.*` フィールドの再設計
- Notes: REQ-0022 を実装する。lint rule が assistantPaths import を強制する

## US-0003-0020: 旧 layout backwards-compatibility window

- Parent: CAP-0003
- Goal: 旧 `.qfai/assistant/steering/` レイアウトを exactly 1 minor release window (v1.9.x) の間、読み取り可能なまま維持する。sunset version (v1.10.0) は `D-DEPRECATED-PATH` warning の本文に明示し、ユーザーに移行猶予を与える
- Non-goals: write path で旧 layout に書き出すこと
- Notes: REQ-0023 を実装する。NFR-0002 (predictable migration window)

## US-0003-0001: ワークスペース初期化

- Parent: CAP-0003
- Goal: `npx qfai init` で `.qfai/` ディレクトリ構造（assistant/, specs/, contracts/, discussion/, evidence/, review/, report/）、設定ファイル（qfai.config.yaml）を生成する
- Non-goals: validate/report/doctor 等の他コマンド機能
- Notes: 空ディレクトリおよび既存プロジェクトの両方で動作すること

## US-0003-0002: 冪等な初期化

- Parent: CAP-0003
- Goal: 2回目以降の `qfai init` 実行時に、既存ファイルをスキップし、新規ファイルのみ追加する
- Non-goals: 既存ファイルの自動マージ・更新
- Notes: NFR-0012（冪等性）を満たすこと

## US-0003-0003: 強制更新

- Parent: CAP-0003
- Goal: `qfai init --force` でスキルファイル（skills/）を最新版に上書き更新する。ただし skills.local/ は保護する
- Non-goals: skills.local/ の上書き
- Notes: 上書き対象と保護対象を明確にログ出力する

## US-0003-0004: ドライラン

- Parent: CAP-0003
- Goal: `qfai init --dry-run` で実行予定の変更内容をプレビュー表示し、実ファイル操作を行わない
- Non-goals: ドライランでのファイル書き込み

## US-0003-0005: symlink ベースのスキル統合

- Parent: CAP-0003
- Goal: `.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/` に `.qfai/assistant/skills/qfai-*` への directory symlink を作成する
- Non-goals: QFAI 管理外のスキルの symlink 化
- Notes: symlink ターゲットは相対パスで指定し、リポジトリの絶対パスに依存しない

## US-0003-0006: Agent symlink 統合

- Parent: CAP-0003
- Goal: `.claude/agents/<name>.md` と `.github/agents/<name>.agent.md` を `.qfai/assistant/agents/<name>.md` へのファイル symlink として配置する。README.md は通常ファイルのまま維持する
- Non-goals: agent 定義の自動変換

## US-0003-0007: レガシーファイル退避

- Parent: CAP-0003
- Goal: 非推奨ファイル（10_workflow.md 等）を検出し、`--force` 時に削除する
- Non-goals: レガシーファイルの自動変換

## US-0003-0008: 旧ラッパー prune

- Parent: CAP-0003
- Goal: `--force` 時に `.claude/commands/qfai-*.md`、`.github/prompts/qfai-*.prompt.md`、旧 skill ディレクトリ（symlink ではない qfai-\* ディレクトリ）を prune する
- Non-goals: 非 QFAI 管理のファイル削除

## US-0003-0009: Git symlink 設定 + Windows 対応

- Parent: CAP-0003
- Goal: `qfai init` 実行時に `git config core.symlinks true` を自動設定し、Windows では EPERM 時に Developer Mode 有効化の案内を表示する
- Non-goals: Windows Developer Mode の自動有効化

## US-0003-0010: copilot-instructions.md 生成

- Parent: CAP-0003
- Goal: `.github/copilot-instructions.md` を生成し、QFAI のリポジトリ指示を配置する
- Non-goals: copilot-instructions.md の全面書き換え

## US-0003-0011: Copilot review instructions 配布

- Parent: CAP-0003
- Goal: `qfai init` 時に `.github/instructions/code-review.instructions.md` と `.github/instructions/principles.instructions.md` を create-only で配布する
- Non-goals: 言語固有のルール追加（SDD skill の責務）

## US-0003-0012: instructions の force 無効保護

- Parent: CAP-0003
- Goal: `--force` を付けても instructions ファイルは上書きされない
- Non-goals: instructions の自動更新

## US-0003-0013: instructions アクティベーション案内

- Parent: CAP-0003
- Goal: instructions ファイルが新規作成された場合にアクティベーションガイダンスを stdout に表示する
- Non-goals: 自動アクティベーション

## US-0003-0014: README ファイル生成

- Parent: CAP-0003
- Goal: `.agents/`, `.codex/`, `.claude/agents/`, `.github/agents/` に README.md を通常ファイルとして配置する
- Non-goals: README の自動更新

## US-0003-0015: `.gitignore` 管理ブロック自動追記

- Parent: CAP-0003
- Goal: `qfai init` 時に導入プロジェクトのルート `.gitignore` に QFAI 管理ブロック（marker 行 + `.qfai/report/*`, `.qfai/evidence/*`, `.qfai/review/*`, `.qfai/discussion/discussion-*/`, README ファイルの negation）を追記する。旧バージョンで追記されたレガシー行（`!.qfai/review/review-*/`, `!.qfai/review/review-*/**`）は再実行時に自動除去する
- Non-goals: ユーザー独自の gitignore エントリの変更/削除、review-pack を追跡したい場合のプロジェクト固有 negation 追加（プロジェクト側で明示追加する）
- Notes: NFR-0012（冪等性）を満たす。`review-*/` ディレクトリはデフォルトで gitignore されるため、必要に応じてプロジェクト側で negation を追加して追跡できる
