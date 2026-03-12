# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                      | AC-Refs                   | Rule                                                                                                                                      | Notes         | NFR-Refs |
| ------------ | -------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| BR-0001-0001 | ディレクトリ構造生成       | AC-0001-0001              | init は .qfai/ 配下に assistant/, specs/, contracts/, discussion/, evidence/, review/, report/ を作成する                                 | REQ-0001 準拠 |          |
| BR-0001-0002 | 設定ファイル生成           | AC-0001-0001              | init は qfai.config.yaml をプロジェクトルートに生成する                                                                                   | REQ-0001 準拠 |          |
| BR-0001-0003 | 既存設定ファイルスキップ   | AC-0001-0004              | qfai.config.yaml がすでに存在する場合はスキップする                                                                                       | REQ-0002 準拠 | NFR-0012 |
| BR-0001-0004 | 既存ディレクトリスキップ   | AC-0001-0004              | .qfai/ 配下の既存ディレクトリ・ファイルは上書きしない（--force 未指定時）                                                                 | REQ-0002 準拠 | NFR-0012 |
| BR-0001-0005 | 欠落ファイル追加           | AC-0001-0005              | 初期化済み環境で欠落ファイルがある場合、欠落分のみ新規作成する                                                                            | REQ-0002 準拠 | NFR-0012 |
| BR-0001-0006 | --force スキル上書き       | AC-0001-0006              | --force 指定時は skills/ 配下のファイルを最新版で上書きする                                                                               | REQ-0003 準拠 |          |
| BR-0001-0007 | skills.local/ 保護         | AC-0001-0006,AC-0001-0007 | --force 指定時でも skills.local/ 配下のファイルは一切変更しない                                                                           | REQ-0003 準拠 |          |
| BR-0001-0008 | --dry-run 無操作           | AC-0001-0008,AC-0001-0009 | --dry-run 指定時は実ファイル操作を行わない                                                                                                | REQ-0004 準拠 |          |
| BR-0001-0009 | --dry-run 出力フォーマット | AC-0001-0008,AC-0001-0009 | --dry-run は [CREATE], [SKIP], [OVERWRITE] プレフィックス付きで変更予定を表示する                                                         | REQ-0004 準拠 |          |
| BR-0001-0010 | symlink 生成対象           | AC-0001-0010              | .claude/skills/, .github/skills/, .codex/skills/, .agents/skills/ に .qfai/assistant/skills/ への symlink を生成する                      | REQ-0005, REQ-0009 準拠 |          |
| BR-0001-0011 | symlink ターゲット解決     | AC-0001-0011              | 各 skill symlink は .qfai/assistant/skills/ 配下のスキルディレクトリへの相対パスで解決される                                              | REQ-0005, REQ-0016 準拠 |          |
| BR-0001-0012 | レガシーファイル検出       | AC-0001-0012              | 非推奨ファイル（10_workflow.md 等）を検出し、.qfai/.legacy/ に退避する                                                                    | REQ-0006 準拠 |          |
| BR-0001-0013 | レガシー非存在時スキップ   | AC-0001-0013              | 非推奨ファイルが存在しない場合はレガシー退避処理をスキップし、.qfai/.legacy/ を作成しない                                                 | REQ-0006 準拠 |          |
| BR-0001-0014 | エラーメッセージ品質       | AC-0001-0003              | エラー発生時は code, message, suggested_action を含むメッセージを表示する                                                                 | REQ-0001 準拠 | NFR-0040 |
| BR-0001-0015 | CLI ヘルプ                 | AC-0001-0014              | `qfai init --help` で使用方法とオプション一覧を表示する                                                                                   |               | NFR-0042 |
| BR-0001-0016 | commands ディレクトリ prune | AC-0001-0015             | --force 実行時に .claude/commands/qfai-*.md を削除する                                                                                    | REQ-0007 準拠 |          |
| BR-0001-0017 | prompts ディレクトリ prune | AC-0001-0016              | --force 実行時に .github/prompts/qfai-*.prompt.md を削除する                                                                              | REQ-0008 準拠 |          |
| BR-0001-0018 | Skill symlink 相対パス生成 | AC-0001-0017,AC-0001-0018 | skill ディレクトリ symlink を相対パス（../../.qfai/assistant/skills/qfai-*）で作成する                                                    | REQ-0009 準拠 |          |
| BR-0001-0019 | fs.symlink type パラメータ | AC-0001-0017,AC-0001-0024 | Windows では fs.symlink() の type に 'dir'/'file' を指定、Unix では不要                                                                   | REQ-0012 準拠 | NFR-S0002 |
| BR-0001-0020 | Agent ファイル symlink 生成 | AC-0001-0019,AC-0001-0020 | .claude/agents/, .github/agents/ にカノニカル agent へのファイル symlink を作成する                                                       | REQ-0010 準拠 |          |
| BR-0001-0021 | GitHub agent 命名変換      | AC-0001-0020              | .github/agents/ では <name>.agent.md としてファイル symlink を作成する（ターゲットは <name>.md）                                          | REQ-0010 準拠 |          |
| BR-0001-0022 | README.md 通常ファイル除外 | AC-0001-0021              | agents/ 配下の README.md は symlink 化せず、通常ファイルのまま維持する                                                                    | REQ-0010 準拠 |          |
| BR-0001-0023 | git config 設定            | AC-0001-0022              | Git リポジトリ内で qfai init 実行時に git config core.symlinks true を実行する                                                            | REQ-0011 準拠 | NFR-S0003 |
| BR-0001-0024 | Git リポジトリ外 skip      | AC-0001-0022              | Git リポジトリ外で実行した場合は git config 処理をスキップする                                                                            | REQ-0011 準拠 |          |
| BR-0001-0025 | Windows symlink 失敗時中断 | AC-0001-0023              | Windows で symlink 作成に失敗した場合、Developer Mode 有効化の案内エラーメッセージを表示し処理を中断する                                   | REQ-0015 準拠 | NFR-S0004 |
| BR-0001-0026 | 既存正常 symlink skip      | AC-0001-0017,AC-0001-0018,AC-0001-0019,AC-0001-0020 | 既に正しい symlink が存在する場合は再作成せずスキップする（冪等性拡張）                                           | REQ-0017 準拠 | NFR-0012 |
| BR-0001-0027 | 壊れた symlink 再作成      | AC-0001-0017,AC-0001-0018,AC-0001-0019,AC-0001-0020 | 壊れた symlink（ターゲット不在）を検出し、削除後に正しい symlink を再作成する                                     | REQ-0017 準拠 | NFR-0012 |
| BR-0001-0028 | 旧ラッパー prune           | AC-0001-0015,AC-0001-0016 | symlink ではない旧 qfai-* ディレクトリ/ファイルを --force 時に削除する                                                                    | REQ-0014 準拠 | NFR-S0005 |
| BR-0001-0029 | copilot-instructions 書換  | AC-0001-0025              | copilot-instructions.md 内の .github/prompts/ 参照を .github/skills/ に書き換える                                                         | REQ-0013 準拠 |          |
| BR-0001-0030 | 相対パス正規化             | AC-0001-0017,AC-0001-0018,AC-0001-0019,AC-0001-0020 | symlink ターゲットは相対パスで指定し、リポジトリの絶対パスに依存しない                                            | REQ-0016 準拠 |          |
