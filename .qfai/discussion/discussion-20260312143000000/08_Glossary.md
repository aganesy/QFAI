# 08_Glossary

## Term Definitions

| Term                  | Definition                                                                                            | Context                         | Source   |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- | -------- |
| Canonical Skill       | `.qfai/assistant/skills/<skill-id>/SKILL.md` に置かれたマスタースキル定義。全ツール統合の SSOT。      | QFAI スキルアーキテクチャ       | SRC-0002 |
| Canonical Agent       | `.qfai/assistant/agents/<name>.md` に置かれたマスターエージェント定義。                               | QFAI エージェントアーキテクチャ | SRC-0002 |
| Wrapper               | ツール統合ディレクトリ（.claude/, .agents/ 等）に置かれた、Canonical Skill/Agent を参照するファイル。 | 旧アーキテクチャ                | SRC-0003 |
| Directory Symlink     | OS レベルのシンボリックリンクでディレクトリを指すもの。Git では mode `120000` で追跡される。          | 新アーキテクチャ                | SRC-0007 |
| File Symlink          | OS レベルのシンボリックリンクでファイルを指すもの。Git では mode `120000` で追跡される。              | 新アーキテクチャ                | SRC-0007 |
| core.symlinks         | Git のローカル設定。`true` の場合、checkout 時に symlink エントリを OS の symlink として作成する。    | Git 設定                        | SRC-0007 |
| Developer Mode        | Windows 10/11 の設定。有効にすると、管理者権限なしで symlink を作成可能。                             | Windows 環境                    | SRC-0008 |
| Integration Directory | `.claude/`, `.agents/`, `.codex/`, `.github/` の各ツール固有ディレクトリ。                            | ラッパー配置先                  | SRC-0002 |
| qfai init             | QFAI プロジェクトの初期化コマンド。スキャフォールドとラッパーを生成する。                             | CLI                             | SRC-0002 |
| Prune                 | `--force` オプション使用時に、不要な旧ファイルを削除する処理。                                        | migration                       | SRC-0002 |

## Abbreviations

| Abbreviation | Full Form                  | Notes                          |
| ------------ | -------------------------- | ------------------------------ |
| SSOT         | Single Source of Truth     | 唯一の正とする情報源           |
| symlink      | Symbolic Link              | シンボリックリンク             |
| CLI          | Command Line Interface     | コマンドラインインターフェース |
| NTFS         | New Technology File System | Windows のファイルシステム     |

## Rules

- Terms must be used consistently across all discussion artifacts.
- Ambiguous or context-dependent terms should include usage context.
