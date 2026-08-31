# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Cover not only normal paths but also error paths, boundary values, and edge cases.

Each row's `Level` is derived with
`.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`:
one falsifying oracle per TC, restricted to the parent BR's obligations, and a
`TC-*` row's `Level` stays within L1-L3. This file spells the layer in the
lowercase word form (`unit`, `integration`) that `isCoverageTargetLevel`
accepts alongside the code form; that spelling is retained for consistency with
the rows already in the table.

`Type` values (deliberately a list, not a table, so the Test Case Table below
stays the first markdown table in this file):

- `normal` — happy path / expected successful behaviour.
- `error` — error, failure, or invalid-input path.
- `boundary` — boundary value (min, max, just-outside-range).
- `edge` — edge case (existing artifact, repeated run, concurrent, empty).

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs                    | EX-Ref       | Type     | Title                                                 |
| ------------ | ----------- | -------------------------- | ------------ | -------- | ----------------------------------------------------- |
| TC-0003-0001 | integration | AC-0003-0001               | EX-0003-0001 | normal   | 空ディレクトリでの初期化                              |
| TC-0003-0002 | integration | AC-0003-0002               | EX-0003-0002 | normal   | 冪等な初期化 - 既存スキップ                           |
| TC-0003-0003 | integration | AC-0003-0003               | EX-0003-0003 | normal   | --force スキル上書き + skills.local 保護              |
| TC-0003-0004 | integration | AC-0003-0004               | EX-0003-0004 | normal   | --dry-run プレビュー                                  |
| TC-0003-0005 | integration | AC-0003-0005               | EX-0003-0005 | normal   | skill directory symlink 生成                          |
| TC-0003-0006 | integration | AC-0003-0006               | EX-0003-0006 | normal   | agent file symlink 生成                               |
| TC-0003-0007 | integration | AC-0003-0007               | EX-0003-0007 | normal   | レガシー 10_workflow.md 削除                          |
| TC-0003-0008 | integration | AC-0003-0008               | EX-0003-0007 | normal   | 旧 commands/prompts prune                             |
| TC-0003-0009 | integration | AC-0003-0009               |              | normal   | git config core.symlinks 自動設定                     |
| TC-0003-0010 | unit        | AC-0003-0010               | EX-0003-0008 | error    | Windows EPERM エラーメッセージ                        |
| TC-0003-0011 | integration | AC-0003-0011               | EX-0003-0009 | normal   | instructions 新規配置                                 |
| TC-0003-0012 | integration | AC-0003-0012               | EX-0003-0010 | edge     | instructions 既存ファイル skip                        |
| TC-0003-0013 | integration | AC-0003-0013               | EX-0003-0011 | edge     | --force でも instructions 保護                        |
| TC-0003-0014 | integration | AC-0003-0014               | EX-0003-0012 | normal   | instructions アクティベーション案内表示               |
| TC-0003-0015 | integration | AC-0003-0002               | EX-0003-0013 | edge     | symlink idempotency (3 consecutive runs)              |
| TC-0003-0016 | integration | AC-0003-0001               | EX-0003-0014 | normal   | migrated example EX-0003-0014 coverage                |
| TC-0003-0017 | integration | AC-0003-0001               | EX-0003-0015 | normal   | migrated example EX-0003-0015 coverage                |
| TC-0003-0018 | integration | AC-0003-0015               | EX-0003-0016 | normal   | gitignore 管理ブロック追記（新規）                    |
| TC-0003-0019 | integration | AC-0003-0016               | EX-0003-0017 | edge     | レガシー行除去と管理ブロック置換                      |
| TC-0003-0020 | integration | AC-0003-0015               | EX-0003-0016 | boundary | review-\*/ サブディレクトリが gitignore 対象          |
| TC-0003-0021 | integration | AC-0003-0017               | EX-0003-0018 | normal   | 4-layer asset-tree seed                               |
| TC-0003-0022 | integration | AC-0003-0018               | EX-0003-0019 | normal   | project-root steering seed                            |
| TC-0003-0023 | integration | AC-0003-0019, AC-0003-0020 | EX-0003-0020 | normal   | --upgrade-assistant-tree migration                    |
| TC-0003-0024 | integration | AC-0003-0021               | EX-0003-0021 | normal   | migration memo authoring                              |
| TC-0003-0025 | unit        | AC-0003-0022               | EX-0003-0022 | normal   | assistantPaths.ts SSOT lint                           |
| TC-0003-0026 | integration | AC-0003-0023, AC-0003-0024 | EX-0003-0023 | edge     | 旧 layout backward compat + sunset warning            |
| TC-0003-0027 | unit        | AC-0003-0025               | EX-0003-0024 | normal   | 配布 job の permission / timeout / concurrency 宣言   |
| TC-0003-0028 | integration | AC-0003-0025               | EX-0003-0025 | error    | persist-credentials 削除で hygiene lane が exit 1     |
| TC-0003-0029 | unit        | AC-0003-0026               | EX-0003-0026 | boundary | lockfile 4 種 + no-lockfile の install 分岐保持       |
| TC-0003-0030 | unit        | AC-0003-0027               | EX-0003-0027 | normal   | 配布 uses が全て 40-hex SHA pin                       |
| TC-0003-0031 | unit        | AC-0003-0027, AC-0003-0028 | EX-0003-0028 | normal   | 可読 version は step name（leading v なし）           |
| TC-0003-0032 | integration | AC-0003-0027               | EX-0003-0029 | error    | sanctioned set 外 third-party を allow-list が reject |
| TC-0003-0033 | integration | AC-0003-0028               | EX-0003-0030 | error    | planted `# v<X.Y.Z>` trailer で leakage guard exit 1  |
| TC-0003-0034 | integration | AC-0003-0029               | EX-0003-0031 | error    | planted actions/ と非 prefix 名の reject              |
| TC-0003-0035 | unit        | AC-0003-0029               | EX-0003-0032 | normal   | 配布ファイル間参照 0 件 + orchestrator job 分離       |
| TC-0003-0036 | integration | AC-0003-0030               | EX-0003-0033 | normal   | script 未宣言 adopter で実行 test lane 0 件           |
| TC-0003-0037 | integration | AC-0003-0030               | EX-0003-0034 | boundary | install job は 1 件 / secret 参照は 0 件              |
| TC-0003-0038 | unit        | AC-0003-0031               | EX-0003-0035 | normal   | docs-only / source diff の lane 選択                  |
| TC-0003-0039 | integration | AC-0003-0031               | EX-0003-0036 | error    | shallow clone / base ref 不達で fail open             |
| TC-0003-0040 | integration | AC-0003-0031               | EX-0003-0037 | boundary | 空 matrix で verdict が exit 0                        |
| TC-0003-0041 | unit        | AC-0003-0032               | EX-0003-0038 | error    | organization-private label literal の reject          |
| TC-0003-0042 | unit        | AC-0003-0026, AC-0003-0032 | EX-0003-0039 | normal   | 配布 header table の記載完全性                        |
| TC-0003-0043 | integration | AC-0003-0033               | EX-0003-0040 | boundary | Node version ファイル不在で fail open                 |
| TC-0003-0044 | integration | AC-0003-0033               | EX-0003-0041 | error    | packageManager field 不在で fail closed               |
| TC-0003-0045 | unit        | AC-0003-0034               | EX-0003-0042 | normal   | write / prune set が配布名リスト由来                  |
| TC-0003-0046 | integration | AC-0003-0034               | EX-0003-0043 | edge     | adopter 作成の同名ファイルを触らない                  |
| TC-0003-0047 | integration | AC-0003-0034               | EX-0003-0044 | boundary | declined ファイルの再作成 / prune / stale 抑止        |
| TC-0003-0048 | unit        | AC-0003-0034               | EX-0003-0045 | normal   | refresh 経路に自前 copy / removal 呼び出し無し        |
| TC-0003-0049 | integration | AC-0003-0035               | EX-0003-0046 | error    | profile / threshold divergence で gate exit 1         |
| TC-0003-0050 | unit        | AC-0003-0035               | EX-0003-0047 | normal   | gate placement と subsumed TC 参照の保持              |
| TC-0003-0051 | integration | AC-0003-0036               | EX-0003-0048 | boundary | declined name の copy 前除外                          |
| TC-0003-0052 | unit        | AC-0003-0034               | EX-0003-0049 | normal   | pruneMatchingEntries の export と predicate           |
| TC-0003-0053 | integration | AC-0003-0033               | EX-0003-0040 | normal   | version ファイルと packageManager が揃う happy path   |
| TC-0003-0054 | integration | AC-0003-0036               | EX-0003-0048 | normal   | declined でない absent name は書き出して記録する      |
| TC-0003-0055 | integration | AC-0003-0037               |              | normal   | Codex agent profile 生成 + --force 再生成             |

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

- `.qfai/assistant/{constitution,manifest,catalog,process}/` が出荷アセットで満たされている
- 上記いずれの layer にも `.gitkeep` は書かれない（layer が空のときだけ空の `.gitkeep` を置く）
- 通常実行と `--dry-run` の双方で、`report()` の "skipped paths" に `.qfai/assistant/<layer>/.gitkeep` が現れない（未配置の placeholder は copied/skipped のどちらにも計上しない）
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

## TC-0003-0027: 配布 job の permission / timeout / concurrency 宣言

**Level:** unit
**EX Refs:** EX-0003-0024
**AC Refs:** AC-0003-0025
**Type:** normal

Setup: `packages/qfai/assets/init/root/.github/workflows/` 配下の全ファイルを読み、YAML として parse する。
Action: 各 workflow の `concurrency:` と各 job の `permissions:` / `timeout-minutes` / artifact upload step を列挙する。
Verify:

- 全 job が job-reachable な `permissions:` を持つ（job 宣言または workflow レベル宣言のいずれか）
- 全 job が `timeout-minutes` を宣言する
- 全 workflow が `cancel-in-progress: true` を伴う ref-scoped `concurrency:` group を宣言する
- orchestrator の verdict job の `permissions:` は空 map である
- artifact upload step があれば cancellation で skip、`if-no-files-found` 許容、`retention-days` が 7 以下

## TC-0003-0028: persist-credentials 削除で hygiene lane が exit 1

**Level:** integration
**EX Refs:** EX-0003-0025
**AC Refs:** AC-0003-0025
**Type:** error

Setup: 配布ツリーを temp ディレクトリへコピーし、1 つの checkout step から `persist-credentials: false` を削除する。
Action: workflow-hygiene lane を planted ツリーと clean ツリーの両方に対して実行する。
Verify:

- planted で exit 1、clean で exit 0
- 出力が違反ファイル・job・rule 名を名指しする
- 配布 set 内で full history 要求（`fetch-depth: 0`）は当該 job のみに現れ、workflow default には現れない

## TC-0003-0029: lockfile 4 種 + no-lockfile の install 分岐保持

**Level:** unit
**EX Refs:** EX-0003-0026
**AC Refs:** AC-0003-0026
**Type:** boundary

Setup: 配布 workflow の install step 本文と `cache:` 式を抽出する。
Action: pnpm / yarn Berry / yarn Classic / npm / lockfile なしの 5 分岐を静的に列挙し、新規配布ファイル側の install step も同様に抽出する。
Verify:

- 5 分岐すべてが存在する（Berry は `--immutable`、Classic は `--frozen-lockfile`）
- `cache:` 式が lockfile 検出の入れ子三項として残り、単一 package manager 値に置換されていない
- 新規配布ファイルの install step が同形の分岐を持つ
- 配布 header に package の `engines` に無い Node support floor の主張が現れない

## TC-0003-0030: 配布 uses が全て 40-hex SHA pin

**Level:** unit
**EX Refs:** EX-0003-0027
**AC Refs:** AC-0003-0027
**Type:** normal

Setup: 配布 workflow set の全 `uses:` 値を抽出する。
Action: 各値の `@` 以降を 40-hex 正規表現に照合する。
Verify:

- 全参照が 40-hex commit SHA に一致する
- floating major / minor / branch 参照が 0 件
- `packages/qfai/tests/assets/assets.test.ts` の floating major 参照 assertion が同一変更で更新済みである（DTC-26 co-change 義務）

## TC-0003-0031: 可読 version は step name（leading v なし）

**Level:** unit
**EX Refs:** EX-0003-0028
**AC Refs:** AC-0003-0027, AC-0003-0028
**Type:** normal

Setup: pin 済み step の `name:` 値と、配布ツリー全ファイルの comment 行を抽出する。
Action: `\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b` を両方に照合し、step name 側に leading `v` なしの version 文字列が在ることを確認する。
Verify:

- 各 pin 済み step の `name:` に leading `v` なしの version 文字列が含まれる
- comment 行に version 文字列が含まれない
- 上記 pattern のマッチが配布ツリー全体で 0 件（guard と同じ pattern で判定する）

## TC-0003-0032: sanctioned set 外 third-party を allow-list が reject

**Level:** integration
**EX Refs:** EX-0003-0029
**AC Refs:** AC-0003-0027
**Type:** error

Setup: 配布ツリーの複製に sanctioned set 外の third-party `uses:` を 1 件 planted する。
Action: workflow-hygiene lane を planted と clean の両方で実行する。
Verify:

- planted で exit 1、当該参照名と allow-list が出力される
- clean（sanctioned entry 1 件が存在する状態）で exit 0 — count-of-zero 判定なら clean で red になるはずなので、allow-list 判定であることが同時に falsify される

## TC-0003-0033: planted `# v<X.Y.Z>` trailer で leakage guard exit 1

**Level:** integration
**EX Refs:** EX-0003-0030
**AC Refs:** AC-0003-0028
**Type:** error

Setup: 配布ファイルに慣例的な `# v6.1.0` pin trailer を planted する。
Action: `bash packages/qfai/scripts/check-no-internal-version-leakage.sh` を planted / clean の両方で実行し、guard script 自体の diff を取る。
Verify:

- planted で exit 1、clean で exit 0
- guard script の pattern 集合・pragma 対応・許容パスの diff が 0 行（narrowing / pragma 新設 / allow-list 追加が行われていない）
- pre-build lint 側の配布 YAML 規則が comment 行を skip する前に評価され、own-line trailer を検出する

## TC-0003-0034: planted actions/ と非 prefix 名の reject

**Level:** integration
**EX Refs:** EX-0003-0031
**AC Refs:** AC-0003-0029
**Type:** error

Setup: 配布 `.github/` に `actions/` ディレクトリを planted し、workflows に `ci.yml` を planted する。
Action: `pnpm verify:pack` と配布命名 assertion を planted / clean の両方で実行する。
Verify:

- `actions/` planted で pack 検証が throw する
- `ci.yml` は `^qfai-[a-z0-9-]+\.yml$` に一致せず命名 assertion で reject される
- planted を戻すと配布 set 全体で exit 0

## TC-0003-0035: 配布ファイル間参照 0 件 + orchestrator job 分離

**Level:** unit
**EX Refs:** EX-0003-0032
**AC Refs:** AC-0003-0029
**Type:** normal

Setup: 配布 workflows ディレクトリの全ファイル名と本文を読む。
Action: 各ファイル本文から他配布ファイル名を検索し、orchestrator の job / matrix leg 一覧を抽出する。
Verify:

- 他配布ファイル名の参照が 0 件（`uses: ./.github/workflows/...` 形式を含む）
- 配布 set のファイル数が 2 以上
- orchestrator が layer ごとに 1 job または 1 matrix leg を宣言する（1 layer = 1 ファイルにはなっていない）

## TC-0003-0036: script 未宣言 adopter で実行 test lane 0 件

**Level:** integration
**EX Refs:** EX-0003-0033
**AC Refs:** AC-0003-0030
**Type:** normal

Setup: layer 名テストスクリプトを 1 つも宣言しない `package.json` を持つ temp ディレクトリ。
Action: `runInit({ dir, force: false, dryRun: false, yes: true })` を実行し、配布された orchestrator の各 test lane 条件を評価する。
Verify:

- 全 test lane が宣言されている（check name が消えない）
- 実行判定される test lane は 0 件
- 各 lane の条件式が参照するのは layer 名スクリプトの存在であり、layer の credential 属性ではない

## TC-0003-0037: install job は 1 件 / secret 参照は 0 件

**Level:** integration
**EX Refs:** EX-0003-0034
**AC Refs:** AC-0003-0030
**Type:** boundary

Setup: TC-0003-0036 と同じ init 出力ツリー。
Action: dependency install を行う job と secret 宣言 / secret context 参照 / `secrets: inherit` を数える。
Verify:

- install する job は validate lane の 1 件のみ
- secret 宣言・secret context 参照・`secrets: inherit` が 0 件
- orchestrator の detection / verdict job は install しないが、各自 `timeout-minutes` を持つ

## TC-0003-0038: docs-only / source diff の lane 選択

**Level:** unit
**EX Refs:** EX-0003-0035
**AC Refs:** AC-0003-0031
**Type:** normal

Setup: 配布 detection シェルを抽出し、Markdown のみの変更リストと source を含む変更リストを用意する。
Action: それぞれを detection シェルに与え、出力 lane 集合を取得する。
Verify:

- Markdown のみでは minimal lane 集合
- source を含む場合は full lane 集合
- 経路に third-party action が現れない（name-only diff + JSON filtering のみ）
- full history 要求は detection job にのみ現れる

## TC-0003-0039: shallow clone / base ref 不達で fail open

**Level:** integration
**EX Refs:** EX-0003-0036
**AC Refs:** AC-0003-0031
**Type:** error

Setup: shallow clone の fixture リポジトリと、base ref に到達できない fixture リポジトリ。
Action: 配布 detection シェルを両 fixture で実行し、認識セット外パスのみを変更した diff でも実行する。
Verify:

- 3 ケースすべてで warning annotation が出力される
- 3 ケースすべてで full lane superset が選択される
- verdict は green（exit 0）— degraded run が確立していない結果を green と主張しないこと（superset なので主張は成立する）

## TC-0003-0040: 空 matrix で verdict が exit 0

**Level:** integration
**EX Refs:** EX-0003-0037
**AC Refs:** AC-0003-0031
**Type:** boundary

Setup: 選択 lane 集合が空になる detection 出力を持つ fixture。
Action: 配布 verdict job の条件と body を評価する。
Verify:

- verdict は always-run 条件で実行され exit 0
- verdict の `permissions:` は空 map
- verdict は detection と同一 workflow ファイル内に定義されている（dependency edge がファイルを越えない）

## TC-0003-0041: organization-private label literal の reject

**Level:** unit
**EX Refs:** EX-0003-0038
**AC Refs:** AC-0003-0032
**Type:** error

Setup: 配布 set の複製に organization-private label literal を `runs-on:` に planted する。
Action: runner selector assertion を planted / clean の両方で実行する。
Verify:

- planted で reject される（exit 1）
- clean では全 selector が repository variable を読み、default は public GitHub-hosted label
- 非 public label literal が set のどこにも 0 件

## TC-0003-0042: 配布 header table の記載完全性

**Level:** unit
**EX Refs:** EX-0003-0039
**AC Refs:** AC-0003-0026, AC-0003-0032
**Type:** normal

Setup: 配布 set の各ファイル header block を読む。
Action: header table の行を parse し、必要項目の存在を照合する。
Verify:

- 読む repository variable 名とその default が記載されている
- 誤値時に GitHub が fail fast せず無期限 queue する失敗モードが記載されている
- `packageManager` manifest field の前提条件、担当 layer、inert 化条件、fail-open 挙動が記載されている
- package の `engines` に無い Node support floor の主張が 0 件

## TC-0003-0043: Node version ファイル不在で fail open

**Level:** integration
**EX Refs:** EX-0003-0040
**AC Refs:** AC-0003-0033
**Type:** boundary

Setup: Node version ファイルを持たない adopter fixture と、持つ adopter fixture。
Action: 配布 setup step を両 fixture で実行する。
Verify:

- 不在 fixture では documented literal が使われ、warning annotation が出力され、step は exit 0 で継続する
- 存在 fixture では当該ファイルの値が優先される
- 不在ケースが fail closed にならない（NFR-C0013 の fail-open クラス）

## TC-0003-0044: packageManager field 不在で fail closed

**Level:** integration
**EX Refs:** EX-0003-0041
**AC Refs:** AC-0003-0033
**Type:** error

Setup: pnpm lockfile を持ち `packageManager` field を持たない adopter fixture。
Action: 配布 install step を実行する。
Verify:

- step が fail closed する（非 0 exit）
- annotation が `packageManager` manifest field を修正箇所として名指しする
- 不透明な resolution error では終わらない
- 後続 lane は computed していない結果を報告しない（継続しない）

## TC-0003-0045: write / prune set が配布名リスト由来

**Level:** unit
**EX Refs:** EX-0003-0042
**AC Refs:** AC-0003-0034
**Type:** normal

Setup: owner-set 解決経路と `init.ts#pruneStaleQfaiWrappers` の 3 call site を読み、両リストに無い `qfai-orphan.yml` を adopter ツリーに置く。
Action: write set / prune set を取得して `SHIPPED_WORKFLOW_NAMES` / `RETIRED_WORKFLOW_NAMES` に照合し、workflows ディレクトリ向けに `pruneMatchingEntries` へ渡される predicate を検査する。
Verify:

- write set が `SHIPPED_WORKFLOW_NAMES` と等しい
- prune set が `RETIRED_WORKFLOW_NAMES` と等しい
- `qfai-orphan.yml` はどちらの set にも含まれず touch されない（prefix glob 由来でないことの falsifying oracle）
- workflows ディレクトリ向けの predicate が `entry.name.startsWith("qfai-")` ではなく retired-name membership である

## TC-0003-0046: adopter 作成の同名ファイルを触らない

**Level:** integration
**EX Refs:** EX-0003-0043
**AC Refs:** AC-0003-0034
**Type:** edge

Setup: QFAI が配布する名前と同名の adopter 作成ファイルを workflows ディレクトリに持つ temp ディレクトリを 4 通り用意する — provenance record が (a) 不在 / (b) `workflows` キー不在 / (c) 不正 JSON / (d) 当該ファイルを含まない正常 record。
Action: `runInit` を 4 通りで実行し、`.gitignore` 管理ブロックも確認する。
Verify:

- 4 通りすべてで当該ファイルの内容が byte 単位で無変更
- (a)(b)(c) では reader が throw せず record を empty として扱う（fail-safe 方向 = 全て adopter-owned）
- (d) では当該ファイルが `adopter-owned` として報告される
- 上書きも prune もされない
- `.qfai/install-provenance.json` は `QFAI_GITIGNORE_BLOCK` に含まれない（tracked である）

## TC-0003-0047: closed 5-state enum の判定

**Level:** integration
**EX Refs:** EX-0003-0044
**AC Refs:** AC-0003-0034
**Type:** boundary

Setup: provenance entry の有無 × ディスク上の有無・bytes 一致の全組合せを 1 fixture ずつ持つ temp ディレクトリ群。
Action: `runInit` と file-state 解決を各 fixture で実行し、状態レポートを読む。
Verify:

- 状態が `absent` / `adopter-owned` / `installed` / `modified` / `declined` の 5 種に決まり、6 番目が現れない
- `declined` は再作成されず、stale drift として報告されず、prune もされない
- `absent`（never-installed）は `declined` と別状態として報告される
- prune は 5 状態すべてで 0 件
- `modified` の 2 原因（新テンプレート出荷 / adopter 手編集）が record の sha256 で区別できる — record は QFAI が書いた bytes の digest であり現在のファイルの digest ではない

## TC-0003-0048: write / removal 経路に自前 fs 呼び出し無し

**Level:** unit
**EX Refs:** EX-0003-0045
**AC Refs:** AC-0003-0034
**Type:** normal

Setup: write / removal 経路のモジュールソースを読み、名前衝突 / declined / `modified` の 3 fixture を seed する。
Action: モジュール本文から `copyFile` / `writeFile` / `rm` / `unlink` 呼び出しを検索し、3 fixture を当該経路に通す。
Verify:

- モジュール内に自前の `copyFile` / `writeFile` / `rm` / `unlink` 呼び出しが 0 件
- 3 fixture すべてが `copyTemplateTree` / `copyTemplatePaths` / `pruneMatchingEntries` 経由で処理される
- 3 fixture の結果がそれぞれ `adopter-owned` / `declined` / `modified` になる
- create-only の `force: false` literal が call site に残り `options.force` に持ち上げられていない

## TC-0003-0049: profile / threshold divergence で gate exit 1

**Level:** integration
**EX Refs:** EX-0003-0046
**AC Refs:** AC-0003-0035
**Type:** error

Setup: 配布 lane の profile 値と failure threshold を宣言された期待形状から divergence させた planted ツリー。
Action: `pnpm ci:lint` を planted / clean の両方で実行し、宣言形状が pin する dimension を数える。
Verify:

- planted で exit 1、failure code `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` と drift した値・期待値が出力される
- clean で exit 0
- 宣言形状が `CLI-WFSET` §5 の 9 dimension をすべて pin している（1 つでも欠落していれば contract 違反）
- 値の SSOT が test suite 側の 1 箇所であり、spec / contract 側に値の重複記載が無い

## TC-0003-0050: gate placement と subsumed TC 参照の保持

**Level:** unit
**EX Refs:** EX-0003-0047
**AC Refs:** AC-0003-0035
**Type:** normal

Setup: `pnpm ci:lint` と `pnpm ci:gate` の script 定義、および subsume 対象だった asset test の test-case annotation を読む。
Action: gate の invocation path を両 script で検索し、subsumed annotation の登録先を確認する。
Verify:

- gate の invocation path が `pnpm ci:lint` に現れる
- `pnpm ci:gate` には現れない（release workflow のみが invoke するため pull request を red にできない）
- subsume された asset test の test-case 参照が期待形状側に登録されたまま残っている（削除されていない）

## TC-0003-0051: declined name の copy 前除外

**Level:** integration
**EX Refs:** EX-0003-0048
**AC Refs:** AC-0003-0036
**Type:** boundary

Setup: provenance 上 install 済みでディスクには不在（`declined`）の配布名が 1 件ある temp ディレクトリ。
Action: `runInit` を実行し、copy primitive に渡された名前集合を観測する。さらに create-only 判定を無効化した対照実行を行う。
Verify:

- 当該名が copy 実行**前**の copy set に含まれていない
- init 後も当該ファイルがディスク上に存在しない
- 対照実行（create-only 無効化）では当該名が書き出される — これが「除外は create-only とは独立した機構である」ことの falsifying oracle であり、create-only であることだけを assert するテストでは本 AC を検証できないことを示す

## TC-0003-0052: pruneMatchingEntries の export と predicate

**Level:** unit
**EX Refs:** EX-0003-0049
**AC Refs:** AC-0003-0034
**Type:** normal

Setup: `packages/qfai/src/cli/commands/init.ts` のソースと export 一覧を読む。
Action: `pruneMatchingEntries` の export 状態と、workflows ディレクトリ向け呼び出しの predicate を検査する。
Verify:

- `pruneMatchingEntries` が export されている（module-private のままでは BR-0003-0042 の「自前 removal 呼び出しゼロ」が充足不可能になる）
- workflows ディレクトリ向け呼び出しの predicate が `RETIRED_WORKFLOW_NAMES` の membership である
- 並行実装（別の removal helper）が 0 件

## TC-0003-0053: version ファイルと packageManager が揃う happy path

**Level:** integration
**EX Refs:** EX-0003-0040
**AC Refs:** AC-0003-0033
**Type:** normal

Setup: Node version ファイルと `packageManager` field の両方を持つ adopter fixture。
Action: 配布 setup-install 列を実行する。
Verify:

- Node version ファイルの値が使われる（documented literal は使われない）
- warning annotation が出力されない
- install が成功し、後続 lane が実際に計算した結果を報告する
- degrade 判定が発火しない — AC-0003-0033 の 2 clause は degrade 時のみ効くという境界を確定させる

## TC-0003-0054: declined でない absent name は書き出して記録する

**Level:** integration
**EX Refs:** EX-0003-0048
**AC Refs:** AC-0003-0036
**Type:** normal

Setup: provenance 記録に entry が無く、ディスク上にも存在しない配布名（state = `absent`）が 1 件ある temp ディレクトリ。
Action: `runInit` を実行し、copy set と provenance 記録を観測する。
Verify:

- 当該名は copy set に**含まれる**（`declined` 除外が絞りすぎていないことの対照）
- init 後にファイルが存在する
- provenance に entry が記録され、`sha256` は書き出した bytes の digest である
- `absent` と `declined` が copy set の構築段階で別扱いされている

## TC-0003-0055: Codex agent profile 生成 + --force 再生成

**Level:** integration
**AC Refs:** AC-0003-0037
**Type:** normal

Setup: 空 temp dir に `runInit` を実行した直後の project。
Action: profile を書き換えた上で `runInit` (plain) と `runInit --force` を実行。
Verify:

- canonical agent 1 件につき `.codex/agents/<name>.toml` が 1 件生成される
- `name` / `description` が canonical frontmatter と一致し、body は `## Mission` 以降と一致する
- `kind: reviewer` の agent のみ `sandbox_mode = "read-only"` を持つ
- 既存 profile は plain run で保持され、`--force` で生成物へ再生成される
- `--dry-run` では `.codex/agents/` が作成されない
