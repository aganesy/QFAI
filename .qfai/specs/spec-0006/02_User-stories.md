# 02 User Stories

## US Catalog

- US-0006-0001: 設定ファイル診断 - qfai.config.yaml の存在・妥当性チェック
- US-0006-0002: ディレクトリ構造診断 - .qfai/ 配下の必要ディレクトリ存在チェック
- US-0006-0003: パス解決診断 - 設定ファイル内パスの解決正確性チェック
- US-0006-0004: レガシー警告 - レガシーファイルレイアウトの警告
- US-0006-0005: JSON 診断出力 - --format json で機械可読な診断結果出力

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
