# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs                    | EX-Ref       | Title                                        |
| ------------ | ----------- | -------------------------- | ------------ | -------------------------------------------- |
| TC-0003-0001 | integration | AC-0003-0001               | EX-0003-0001 | 空ディレクトリでの初期化                     |
| TC-0003-0002 | integration | AC-0003-0002               | EX-0003-0002 | 冪等な初期化 - 既存スキップ                  |
| TC-0003-0003 | integration | AC-0003-0003               | EX-0003-0003 | --force スキル上書き + skills.local 保護     |
| TC-0003-0004 | integration | AC-0003-0004               | EX-0003-0004 | --dry-run プレビュー                         |
| TC-0003-0005 | integration | AC-0003-0005               | EX-0003-0005 | skill directory symlink 生成                 |
| TC-0003-0006 | integration | AC-0003-0006               | EX-0003-0006 | agent file symlink 生成                      |
| TC-0003-0007 | integration | AC-0003-0007               | EX-0003-0007 | レガシー 10_workflow.md 削除                 |
| TC-0003-0008 | integration | AC-0003-0008               | EX-0003-0007 | 旧 commands/prompts prune                    |
| TC-0003-0009 | integration | AC-0003-0009               |              | git config core.symlinks 自動設定            |
| TC-0003-0010 | unit        | AC-0003-0010               | EX-0003-0008 | Windows EPERM エラーメッセージ               |
| TC-0003-0011 | integration | AC-0003-0011               | EX-0003-0009 | instructions 新規配置                        |
| TC-0003-0012 | integration | AC-0003-0012               | EX-0003-0010 | instructions 既存ファイル skip               |
| TC-0003-0013 | integration | AC-0003-0013               | EX-0003-0011 | --force で instructions 再生成               |
| TC-0003-0014 | integration | AC-0003-0014               | EX-0003-0012 | instructions アクティベーション案内表示      |
| TC-0003-0015 | integration | AC-0003-0002               | EX-0003-0013 | symlink idempotency (3 consecutive runs)     |
| TC-0003-0016 | integration | AC-0003-0001               | EX-0003-0014 | migrated example EX-0003-0014 coverage       |
| TC-0003-0017 | integration | AC-0003-0001               | EX-0003-0015 | migrated example EX-0003-0015 coverage       |
| TC-0003-0018 | integration | AC-0003-0015               | EX-0003-0016 | gitignore 管理ブロック追記（新規）           |
| TC-0003-0019 | integration | AC-0003-0016               | EX-0003-0017 | レガシー行除去と管理ブロック置換             |
| TC-0003-0020 | integration | AC-0003-0015               | EX-0003-0016 | review-\*/ サブディレクトリが gitignore 対象 |
| TC-0003-0021 | integration | AC-0003-0017               | EX-0003-0018 | 4-layer asset-tree seed                      |
| TC-0003-0022 | integration | AC-0003-0018               | EX-0003-0019 | project-root steering seed                   |
| TC-0003-0023 | integration | AC-0003-0019, AC-0003-0020 | EX-0003-0020 | --upgrade-assistant-tree migration           |
| TC-0003-0024 | integration | AC-0003-0021               | EX-0003-0021 | migration memo authoring                     |
| TC-0003-0025 | unit        | AC-0003-0022               | EX-0003-0022 | assistantPaths.ts SSOT lint                  |
| TC-0003-0026 | integration | AC-0003-0023, AC-0003-0024 | EX-0003-0023 | 旧 layout backward compat + sunset warning   |

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

## TC-0003-0021: 4-layer asset-tree seed

**Level:** integration
**EX Refs:** EX-0003-0018
**AC Refs:** AC-0003-0017

Setup: empty temp dir.
Action: `runInit({ root })`.
Verify:

- `.qfai/assistant/constitution/.gitkeep` が存在する
- `.qfai/assistant/manifest/.gitkeep` が存在する
- `.qfai/assistant/catalog/.gitkeep` が存在する
- `.qfai/assistant/process/.gitkeep` が存在する
- `.qfai/assistant/steering/` ディレクトリは存在しない

## TC-0003-0022: project-root steering seed

**Level:** integration
**EX Refs:** EX-0003-0019
**AC Refs:** AC-0003-0018

Setup: empty temp dir.
Action: `runInit({ root })`、その後ユーザー編集をシミュレートして `.qfai/steering/_templates/entry.md` に追記 → `runInit({ root })` を再実行。
Verify:

- 初回実行で `.qfai/steering/README.md`, `.qfai/steering/.gitkeep`, `.qfai/steering/_templates/entry.md` が seed される
- 2 回目実行後もユーザー追記内容が `_templates/entry.md` に残っている

## TC-0003-0023: --upgrade-assistant-tree migration

**Level:** integration
**EX Refs:** EX-0003-0020
**AC Refs:** AC-0003-0019, AC-0003-0020

Setup: 旧 `.qfai/assistant/steering/manifest.md` 等のレイアウトを seed した temp dir。
Action: `runInit({ root, upgradeAssistantTree: true })`.
Verify:

- exit code 0
- `.qfai/assistant/{constitution,manifest,catalog,process}/` の 4 層が作成される
- stdout に `W-USER-EDIT-PRESERVED` を含む note が少なくとも 1 件出力される
- ユーザー編集ファイル内容が新 layer 側に到達している

## TC-0003-0024: migration memo authoring

**Level:** integration
**EX Refs:** EX-0003-0021
**AC Refs:** AC-0003-0021

Setup: 旧 `.qfai/assistant/steering/` を持つ temp dir + `packages/qfai/package.json#version` のテスト用 mock。
Action: `runInit({ root, upgradeAssistantTree: true })`.
Verify:

- `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` が生成される
- 本文に「移行前 layout」「移行後 layout」「影響ファイル一覧」「sunset 予定 minor version」の 4 セクションが含まれる
- 2 回目に `runInit({ ..., upgradeAssistantTree: true })` を実行しても memo の内容が touch されない (BR-0003-0018)

## TC-0003-0025: assistantPaths.ts SSOT lint

**Level:** unit
**EX Refs:** EX-0003-0022
**AC Refs:** AC-0003-0022

Setup: `packages/qfai/src/cli/commands/init.ts` ソースを read。
Action: `grep -E '"\.qfai/assistant/(constitution|manifest|catalog|process|steering)'` 相当の regex で string literal を検出。
Verify:

- マッチが 0 件 (assistantPaths.ts の import 経由でのみパスが構築されている)
- `assistantPaths.ts` の export (`CONSTITUTION_DIR_REL`, `MANIFEST_DIR_REL`, `CATALOG_DIR_REL`, `PROCESS_DIR_REL`) が init.ts から import されている

## TC-0003-0026: 旧 layout backward compat + sunset warning

**Level:** integration
**EX Refs:** EX-0003-0023
**AC Refs:** AC-0003-0023, AC-0003-0024

Setup: v1.8.x の `.qfai/assistant/steering/` レイアウトを持つ temp dir。
Action: v1.9.0 の `runInit({ root })` (no flag) を実行。
Verify:

- exit code 0
- 旧 `.qfai/assistant/steering/` は削除されていない (ファイル内容も unchanged)
- stdout に `D-DEPRECATED-PATH` warning が出力される
- warning 本文に `v1.10.0` という具体的な sunset minor version が文字列として含まれる
- 「次の release」「将来」などの曖昧表現は warning 本文に含まれない
