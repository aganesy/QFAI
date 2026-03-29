# 02 User Stories

## US Catalog

- US-0001-0001: ワークスペース初期化 - qfai init で .qfai/ 構造を生成
- US-0001-0002: 冪等な初期化 - 2回目以降はスキップ + 新規のみ追加
- US-0001-0003: 強制更新 - --force でスキル上書き（skills.local/ 保護）
- US-0001-0004: ドライラン - --dry-run で変更プレビュー
- US-0001-0005: マルチツールラッパー生成 - Claude/Copilot/Codex/Agents ラッパー
- US-0001-0006: レガシーファイル退避 - 非推奨ファイル検出・退避
- US-0001-0007: commands/prompts 廃止 + skill symlink 統合 - 旧ラッパー廃止と symlink ベース統合
- US-0001-0008: Agent ラッパーの symlink 化 - agent ラッパーを symlink に移行
- US-0001-0009: Git symlink 設定 + Windows 対応 - git config 自動設定とクロスプラットフォーム対応
- US-0001-0010: copilot-instructions.md 参照先更新 - prompts から skills への参照パス更新
- US-0001-0011: マイグレーションとアップグレードサポート - 旧バージョンからのアップグレード時に stale asset 検出・移行パス提供
- US-0001-0012: バージョン表記の正規化 - changelog/steering docs/ソースコメント間のバージョン一貫性確保
- US-0001-0013: 内部モジュールワークフロードキュメント - critique/calibration/observability/handoff/detection モジュールのワークフロードキュメント整備

## US-0001-0001: ワークスペース初期化

- Parent: CAP-0001
- Goal: `npx qfai init` で `.qfai/` ディレクトリ構造（assistant/, specs/, contracts/, discussion/, evidence/, review/, report/）、設定ファイル（qfai.config.yaml）を生成する
- Non-goals: validate/report/doctor 等の他コマンド機能
- Notes: 空ディレクトリおよび既存プロジェクトの両方で動作すること

## US-0001-0002: 冪等な初期化

- Parent: CAP-0001
- Goal: 2回目以降の `qfai init` 実行時に、既存ファイルをスキップし、新規ファイルのみ追加する
- Non-goals: 既存ファイルの自動マージ・更新
- Notes: NFR-0012（冪等性）を満たすこと。既存ファイルのスキップ時にはコンソールに情報メッセージを表示する

## US-0001-0003: 強制更新

- Parent: CAP-0001
- Goal: `qfai init --force` でスキルファイル（skills/）を最新版に上書き更新する。ただし skills.local/ は保護する
- Non-goals: skills.local/ の上書き
- Notes: REQ-0003 準拠。上書き対象と保護対象を明確にログ出力する

## US-0001-0004: ドライラン

- Parent: CAP-0001
- Goal: `qfai init --dry-run` で実行予定の変更内容（作成・上書き・スキップ）をプレビュー表示し、実ファイル操作を行わない
- Non-goals: ドライランでのファイル書き込み
- Notes: REQ-0004 準拠。出力フォーマットは [CREATE], [SKIP], [OVERWRITE] プレフィックス

## US-0001-0005: マルチツールラッパー生成

- Parent: CAP-0001
- Goal: Claude Code (.claude/commands/)、GitHub Copilot (.github/prompts/)、Codex (.codex/skills/)、Agents (.agents/skills/) のラッパーファイルを生成する
- Non-goals: 各ツール固有の設定最適化
- Notes: REQ-0005 準拠。各ツールのラッパーはスキルファイルへの参照を含む

## US-0001-0006: レガシーファイル退避

- Parent: CAP-0001
- Goal: 非推奨ファイル（10_workflow.md 等）を検出し、`.qfai/.legacy/` に退避する
- Non-goals: レガシーファイルの自動変換・マイグレーション
- Notes: REQ-0006 準拠。退避時にはログで退避元・退避先を表示する

## US-0001-0007: commands/prompts 廃止 + skill symlink 統合

- Parent: CAP-0001
- Goal: `.claude/commands/` と `.github/prompts/` を廃止し、各ツールの `skills/` ディレクトリ（`.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/`）に `.qfai/assistant/skills/qfai-*` へのシンボリックリンクを配置する
- Non-goals: QFAI 管理外のスキル（pr-fix, pr-merge 等）の symlink 化
- Notes: REQ-0007, REQ-0008, REQ-0009 準拠。スラッシュコマンドとスキルの二重管理を排除し、マスタースキルの更新が即座に全ツールへ反映される

## US-0001-0008: Agent ラッパーの symlink 化

- Parent: CAP-0001
- Goal: `.claude/agents/<name>.md` と `.github/agents/<name>.agent.md` を `.qfai/assistant/agents/<name>.md` へのファイルシンボリックリンクとして配置する。README.md は通常ファイルのまま維持する
- Non-goals: agent 定義の自動変換・マイグレーション
- Notes: REQ-0010 準拠。`.github/agents/` 側は `.agent.md` 命名変換を行う

## US-0001-0009: Git symlink 設定 + Windows 対応

- Parent: CAP-0001
- Goal: `qfai init` 実行時に `git config core.symlinks true` を自動設定し、Windows では Developer Mode が無効な場合に明確なエラーメッセージと対処法を表示して処理を中断する
- Non-goals: Windows Developer Mode の自動有効化
- Notes: REQ-0011, REQ-0015 準拠。macOS/Linux では追加設定不要で symlink を作成する

## US-0001-0010: copilot-instructions.md 参照先更新

- Parent: CAP-0001
- Goal: `.github/copilot-instructions.md` 内の `.github/prompts/` 参照を `.github/skills/` に更新する
- Non-goals: copilot-instructions.md の全面書き換え
- Notes: REQ-0013 準拠。Copilot が正しい skill 参照先を案内されるようにする

## US-0001-0011: マイグレーションとアップグレードサポート

- Parent: CAP-0001
- Goal: 旧バージョン（v1.7.5 以前）のプロジェクトを `qfai init` でアップグレードする際に、stale アセットを検出してアップグレードガイダンスと明示的な移行パスを提供する。サポート外バージョン（例: v1.4.0）からのマイグレーションは手動移行必須エラーで明示的に拒否する。移行中のロールバックをサポートし、完了済みプロジェクトへの再実行は安全な no-op とする
- Non-goals: サポート外バージョンの自動マイグレーション、外部ツール設定の自動変換
- Notes: REQ-0018 準拠。discussion-20260329195516830 の discussion story 12 に対応。移行フロー: pre-migration → migrating → migrated

## US-0001-0012: バージョン表記の正規化

- Parent: CAP-0001
- Goal: CHANGELOG、steering docs、ソースコメントにおけるバージョン表記を一貫させ、`qfai validate` でバージョン不整合（例: ソースが v1.7.5 を参照しているが changelog が v1.7.6 を示す）を検出・報告できるようにする
- Non-goals: バージョン不整合の自動修正
- Notes: REQ-0019 準拠。discussion-20260329195516830 の discussion story 10 に対応

## US-0001-0013: 内部モジュールワークフロードキュメント

- Parent: CAP-0001
- Goal: critique、calibration、observability、handoff、detection 各内部モジュールについて、使用方法ドキュメント・エントリポイントドキュメント・モード関係ドキュメント・障害時挙動ドキュメントを整備し、メンテナーガイダンスなしで発見・利用可能にする
- Non-goals: モジュールの API 変更、外部ユーザー向けドキュメント
- Notes: REQ-0019 準拠（ドキュメント正規化の一部）。discussion-20260329195516830 の discussion story 11 に対応
