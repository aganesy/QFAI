# 02 User Stories

## US Catalog

- US-0001-0001: ワークスペース初期化 - qfai init で .qfai/ 構造を生成
- US-0001-0002: 冪等な初期化 - 2回目以降はスキップ + 新規のみ追加
- US-0001-0003: 強制更新 - --force でスキル上書き（skills.local/ 保護）
- US-0001-0004: ドライラン - --dry-run で変更プレビュー
- US-0001-0005: マルチツールラッパー生成 - Claude/Copilot/Codex/Agents ラッパー
- US-0001-0006: レガシーファイル退避 - 非推奨ファイル検出・退避

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
