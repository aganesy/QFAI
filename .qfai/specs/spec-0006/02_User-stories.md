# 02 User Stories

## US Catalog

- US-0006-0001: 設定ファイル診断 - qfai.config.yaml の存在・妥当性チェック
- US-0006-0002: ディレクトリ構造診断 - .qfai/ 配下の必要ディレクトリ存在チェック
- US-0006-0003: パス解決診断 - 設定ファイル内パスの解決正確性チェック
- US-0006-0004: レガシー警告 - レガシーファイルレイアウトの警告
- US-0006-0005: JSON 診断出力 - --format json で機械可読な診断結果出力
- US-0006-0008: stale review-pack TTL archival - `doctor --clean` で古い review pack を `_archive/` へ move
- US-0006-0009: doctor --autoremediate - 安全な範囲で検出かつ自動修復
- US-0006-0010: per-skill manifest probe - `doctor --profile <skill>` で runtimeDependencies を probe
- US-0006-0011: shipped workflow drift detection - install 済み shipped workflow の乖離を advisory finding で通知

## US-0006-0001: 設定ファイル診断

- Parent: CAP-0006
- Goal: `qfai doctor` で qfai.config.yaml の存在と妥当性（必須フィールド、型、値の範囲）をチェックし、結果を表示する
- Non-goals: 設定ファイルの自動修正

## US-0006-0002: ディレクトリ構造診断

- Parent: CAP-0006
- Goal: `.qfai/` 配下の必要ディレクトリ（specs/, contracts/, discussion/ 等）の存在チェック
- Non-goals: ディレクトリの自動作成

## US-0006-0003: パス解決診断

- Parent: CAP-0006
- Goal: 設定ファイル内の各パス（testsDir, outDir 等）が実際に解決可能かチェック
- Non-goals: パスの自動修正

## US-0006-0004: レガシー警告

- Parent: CAP-0006
- Goal: レガシーファイルレイアウト（旧バージョンの残存物）を検出して警告する
- Non-goals: レガシーファイルの自動マイグレーション

## US-0006-0005: JSON 診断出力

- Parent: CAP-0006
- Goal: `--format json` で machine-readable な診断結果を出力する。`--out` でファイル出力も可能
- Non-goals: カスタム出力スキーマ

## US-0006-0006: playwright primary probe

- Parent: CAP-0006
- Goal: `qfai doctor --profile prototyping` が `node_modules/.bin/playwright` を primary launcher 候補として probe し、`npx --no-install playwright --version` を fallback として扱う。`playwright-cli` は deprecation window 中 accepted だが `D-DEPRECATED-PROBE` (warning during window, error at sunset `1.10.0`) を surface する。fresh `qfai init` + `npm i -D playwright` の状態で `[error]` line を 1 つも出さないことが acceptance signal (NFR-0112)。
- Non-goals: playwright 自体の auto-install、prototyping iterate の実行

## US-0006-0007: doctor 出力 group 分け + skills.integrity downgrade

- Parent: CAP-0006
- Goal: `qfai doctor` の summary を "errors blocking the active profile" / "warnings advisory of drift" の 2 group に明示的に分割表示する。`skills.integrity` は既定で `warning` severity として後者の group に表示される (message 文言にかかわらず active profile を block しない)。
- Non-goals: skill 整合性 check 自体のロジック変更

## US-0006-0008: stale review-pack TTL archival

- Parent: CAP-0006
- Goal: `qfai doctor --clean` が `.qfai/review/<ts>/` の中で TTL (既定 14 日 / DR-0264、`qfai.config.yaml#review.staleTtlDays` で設定可能) を超過した pack を `.qfai/review/_archive/<ts>/` へ move する。archival は NEVER delete; restore は手動 `mv` 戻し。`qfai validate --profile review` は `_archive/` を out-of-scope とし top-level pack のみ scan する。in-scope pack の `QFAI-REVIEW-003/004/005` 挙動は不変。
- Non-goals: pack の自動削除、`_archive/` 内 pack の validate scan、復元 CLI subcommand

## US-0006-0009: doctor --autoremediate mode

- Parent: CAP-0006
- Goal: `qfai doctor --autoremediate` が safe な範囲で detect AND fix する: (a) active skill manifest の `runtimeDependencies` (CLI-MANIFEST / REQ-0159) に対する `npm install`、(b) `--clean` TTL-archive (REQ-0153 / US-0006-0008)、(c) `qfai.config.yaml` に欠落した default-keyed フィールドの書き込み。既定で interactive `--yes` 確認が必須、`--yes` flag で確認 skip、`--dry-run` は副作用なしで preview。CI 環境では `--autoremediate=off` を既定とし "autoremediate disabled in CI" line を明示出力する。
- Non-goals: 非 default-keyed フィールドの書き換え、user-authored config 値の上書き、CI での暗黙 install

## US-0006-0010: per-skill manifest runtimeDependencies probe

- Parent: CAP-0006
- Goal: `qfai doctor --profile <skill>` が `assets/init/.qfai/assistant/skills/<skill>/manifest.json` (CLI-MANIFEST) を読み、各 `runtimeDependencies` entry について `node_modules/.bin/...` / `node_modules/<name>/` を probe する。missing は install command 付きで report。empty list は probe しない (false positive なし)。manifest 宣言と probe 結果の drift で `R-SKILL-MANIFEST-DRIFT` を emit (SSOT-sync Pair III)。
- Non-goals: manifest schema 著作 / 配布側 lint (spec-0015 owned)、依存の auto-install (それは `--autoremediate` の責務)

## US-0006-0011: shipped workflow drift detection (detection half)

- Parent: CAP-0006
- Goal: adopter が「修正済みの template が自分の repository に届いていない」ことを気づける route を持つ。`qfai doctor` は adopter tree の `.github/workflows/` に install 済みの shipped workflow を install 済み package 同梱の copy と比較し (既存 `skills.integrity` と同型の比較)、乖離を dotted-lowercase check id `workflows.integrity` の advisory finding として通知する。finding は stale file の path と、その時点で利用可能な repair — 「install 済み package 内の copy で当該ファイルを置き換える」手動手順 — を名指しする。shipped tree は create-only (force off) で copy されるため `qfai init --force` でも refresh されない、という前提に対する非破壊の通知 channel である。
- Non-goals: shipped workflow の上書き / refresh / prune (OQ-0021 に blocked; 本 spec の out of scope)、advisory 内での refresh command / CLI verb / flag の名指し、shipped workflow の所有権契約と provenance record の**作成・書き込み・schema 定義** (spec-0003 / REQ-0020 owned — 本 spec は provenance record を**読む**が、書かない・所有しない。読まなければ adopter 自作ファイルと QFAI 由来の stale ファイルを区別できず、所有していないファイルを drift 報告してしまう)、`qfai validate` 側への finding 追加、exit code の変更
