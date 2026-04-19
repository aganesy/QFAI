# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                           | AC-Refs                                  | Rule                                                                                                                                       |
| ------------ | ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-0003-0001 | create-only デフォルト          | AC-0003-0001, AC-0003-0002               | root/ と .qfai/ のテンプレートは create-only（既存は skip）で配置する                                                                      |
| BR-0003-0002 | skills.local 保護               | AC-0003-0003                             | `--force` でスキルを上書きする際も `assistant/skills.local/` 配下は保護する                                                                |
| BR-0003-0003 | dry-run ファイル操作禁止        | AC-0003-0004                             | `--dry-run` 時はファイル書き込み・symlink 作成・削除を一切行わない                                                                         |
| BR-0003-0004 | symlink ターゲット相対パス      | AC-0003-0005                             | symlink ターゲットは相対パスで指定し、リポジトリの絶対パスに依存しない                                                                     |
| BR-0003-0005 | skill symlink type: dir         | AC-0003-0005                             | skills ディレクトリの symlink は `type: 'dir'` で作成する                                                                                  |
| BR-0003-0006 | agent symlink type: file        | AC-0003-0006                             | agents ファイルの symlink は `type: 'file'` で作成する。README.md は symlink 化しない                                                      |
| BR-0003-0007 | git config 前提条件             | AC-0003-0009                             | Git リポジトリ内の場合のみ `git config core.symlinks true` を実行する。Git リポジトリ外では skip する                                      |
| BR-0003-0008 | EPERM Windows エラーメッセージ  | AC-0003-0010                             | Windows で EPERM エラー時は Developer Mode 有効化の案内 URL を含むエラーメッセージを表示して処理を中断する                                 |
| BR-0003-0009 | instructions create-only 保護   | AC-0003-0011, AC-0003-0012, AC-0003-0013 | instructions ファイルは create-only。`--force` でも上書きしない。0バイトの空ファイルも「存在する」として扱う                               |
| BR-0003-0010 | instructions アクティベーション | AC-0003-0014                             | 1つ以上の instructions ファイルが新規作成された場合にのみアクティベーション案内を出力する                                                  |
| BR-0003-0011 | prune 対象カテゴリ              | AC-0003-0007, AC-0003-0008               | `--force` 時に prune するもの: `.claude/commands/qfai-*.md`、`.github/prompts/qfai-*.prompt.md`、非 symlink の `qfai-*` skill ディレクトリ |
| BR-0003-0012 | idempotent symlink              | AC-0003-0002, AC-0003-0005               | 既存の正しい symlink は skip し、壊れた symlink のみ再作成する                                                                             |
| BR-0003-0013 | 管理ブロック内容 SSOT           | AC-0003-0015                             | `.gitignore` 管理ブロックは marker + `.qfai/report/*` + README negation + `.qfai/evidence/*` + README negation + `.qfai/discussion/discussion-*/` + `.qfai/review/*` + README negation の 9 行で構成する。SSOT は `packages/qfai/src/core/gitignore.ts` |
| BR-0003-0014 | レガシー行除去 (migration)      | AC-0003-0016                             | 再実行時、marker 行以降の連続する既知行（現行ブロック行 ∪ `QFAI_GITIGNORE_LEGACY_LINES`）を順不同で除去してから新ブロックを追記する。未知行で停止する（ユーザー記述保護）                                                                         |
