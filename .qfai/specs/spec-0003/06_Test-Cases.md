# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs      | EX-Ref       | Title                                        |
| ------------ | ----------- | ------------ | ------------ | -------------------------------------------- |
| TC-0003-0001 | integration | AC-0003-0001 | EX-0003-0001 | 空ディレクトリでの初期化                     |
| TC-0003-0002 | integration | AC-0003-0002 | EX-0003-0002 | 冪等な初期化 - 既存スキップ                  |
| TC-0003-0003 | integration | AC-0003-0003 | EX-0003-0003 | --force スキル上書き + skills.local 保護     |
| TC-0003-0004 | integration | AC-0003-0004 | EX-0003-0004 | --dry-run プレビュー                         |
| TC-0003-0005 | integration | AC-0003-0005 | EX-0003-0005 | skill directory symlink 生成                 |
| TC-0003-0006 | integration | AC-0003-0006 | EX-0003-0006 | agent file symlink 生成                      |
| TC-0003-0007 | integration | AC-0003-0007 | EX-0003-0007 | レガシー 10_workflow.md 削除                 |
| TC-0003-0008 | integration | AC-0003-0008 | EX-0003-0007 | 旧 commands/prompts prune                    |
| TC-0003-0009 | integration | AC-0003-0009 |              | git config core.symlinks 自動設定            |
| TC-0003-0010 | unit        | AC-0003-0010 | EX-0003-0008 | Windows EPERM エラーメッセージ               |
| TC-0003-0011 | integration | AC-0003-0011 | EX-0003-0009 | instructions 新規配置                        |
| TC-0003-0012 | integration | AC-0003-0012 | EX-0003-0010 | instructions 既存ファイル skip               |
| TC-0003-0013 | integration | AC-0003-0013 | EX-0003-0011 | --force でも instructions 保護               |
| TC-0003-0014 | integration | AC-0003-0014 | EX-0003-0012 | instructions アクティベーション案内表示      |
| TC-0003-0015 | integration | AC-0003-0002 | EX-0003-0013 | symlink idempotency (3 consecutive runs)     |
| TC-0003-0016 | integration | AC-0003-0001 | EX-0003-0014 | migrated example EX-0003-0014 coverage       |
| TC-0003-0017 | integration | AC-0003-0001 | EX-0003-0015 | migrated example EX-0003-0015 coverage       |
| TC-0003-0018 | integration | AC-0003-0015 | EX-0003-0016 | gitignore 管理ブロック追記（新規）           |
| TC-0003-0019 | integration | AC-0003-0016 | EX-0003-0017 | レガシー行除去と管理ブロック置換             |
| TC-0003-0020 | integration | AC-0003-0015 | EX-0003-0016 | review-\*/ サブディレクトリが gitignore 対象 |

## TC-0003-0001: 空ディレクトリでの初期化

**Level:** integration
**EX Refs:** EX-0003-0001
**AC Refs:** AC-0003-0001

Setup: 一時ディレクトリを作成する。
Action: `runInit({ dir, force: false, dryRun: false, yes: true })` を実行する。
Verify:

- `.qfai/` 配下に assistant/, specs/, contracts/ 等が存在する
- `qfai.config.yaml` が存在する
- symlink が 4 つの skills/ ディレクトリに生成されている

## TC-0003-0005: skill directory symlink 生成

**Level:** integration
**EX Refs:** EX-0003-0005
**AC Refs:** AC-0003-0005

Setup: 空ディレクトリで `runInit` を実行する。
Action: 生成された symlink を `lstat` で確認する。
Verify:

- `.claude/skills/qfai-*` が isSymbolicLink() = true
- `readlink` の結果が `../../.qfai/assistant/skills/qfai-*` 形式の相対パス

## TC-0003-0011: instructions 新規配置

**Level:** integration
**EX Refs:** EX-0003-0009
**AC Refs:** AC-0003-0011

Setup: 一時ディレクトリ（`.github/instructions/` なし）を作成する。
Action: `runInit` を実行する。
Verify:

- `.github/instructions/code-review.instructions.md` が存在する
- `.github/instructions/principles.instructions.md` が存在する
- 両ファイルに YAML frontmatter (`applyTo`, `excludeAgent`) が含まれる

## TC-0003-0016: Coverage Placeholder for EX-0003-0014

- EX-Ref: EX-0003-0014
- AC-Refs: AC-0003-0001
- Verify that migrated example EX-0003-0014 is covered by at least one test case.

## TC-0003-0017: Coverage Placeholder for EX-0003-0015

- EX-Ref: EX-0003-0015
- AC-Refs: AC-0003-0001
- Verify that migrated example EX-0003-0015 is covered by at least one test case.

## TC-0003-0018: gitignore 管理ブロック追記（新規）

**Level:** integration
**EX Refs:** EX-0003-0016
**AC Refs:** AC-0003-0015

Setup: 一時ディレクトリを作成する（`.gitignore` 未存在）。
Action: `runInit({ dir, force: false, dryRun: false, yes: true })` を実行する。
Verify:

- `.gitignore` が生成されている
- `QFAI_GITIGNORE_MARKER` が 1 件存在する
- 必須 7 エントリ（`.qfai/report/*`, `!.qfai/report/README.md`, `.qfai/evidence/*`, `!.qfai/evidence/README.md`, `.qfai/review/*`, `!.qfai/review/README.md`, `.qfai/discussion/discussion-*/`）が含まれる
- レガシー 2 エントリ（`!.qfai/review/review-*/`, `!.qfai/review/review-*/**`）は含まれない

## TC-0003-0019: レガシー行除去と管理ブロック置換

**Level:** integration
**EX Refs:** EX-0003-0017
**AC Refs:** AC-0003-0016

Setup: 一時ディレクトリを作成し、旧ブロック（marker + 現行 7 エントリ + `!.qfai/review/review-*/` + `!.qfai/review/review-*/**`）を `.gitignore` に書き込む。
Action: `runInit` を実行する。
Verify:

- marker 件数が 1 件である
- `!.qfai/review/review-*/` と `!.qfai/review/review-*/**` が除去されている
- 新ブロックの必須 7 エントリが含まれている

## TC-0003-0020: review-\*/ サブディレクトリが gitignore 対象

**Level:** integration
**EX Refs:** EX-0003-0016
**AC Refs:** AC-0003-0015

Setup: `runInit` を実行した後のプロジェクトディレクトリ。
Action: `.gitignore` を読み取り、review-\*/ に関する negation が存在しないことを確認する。
Verify:

- `.qfai/review/*` が含まれる
- `!.qfai/review/review-*/` が含まれない
- `!.qfai/review/review-*/**` が含まれない
