# 02 User Stories

## US Catalog

- US-0004-0001: 設定ファイル診断 - qfai.config.yaml の存在・妥当性チェック
- US-0004-0002: ディレクトリ構造診断 - .qfai/ 配下の必要ディレクトリ存在チェック
- US-0004-0003: パス解決診断 - 設定ファイル内パスの解決正確性チェック
- US-0004-0004: レガシー警告 - v1.4.25+ レガシーファイルレイアウトの警告
- US-0004-0005: JSON 診断出力 - --format json で機械可読な診断結果出力

## US-0004-0001: 設定ファイル診断

- Parent: CAP-0004
- Goal: `qfai doctor` で qfai.config.yaml の存在と妥当性（必須フィールド、型、値の範囲）をチェックし、結果を表示する
- Non-goals: ディレクトリ構造チェック、パス解決チェック、レガシー警告
- Notes: 設定ファイルが存在しない場合はエラー、存在するが不正な場合は具体的な問題点を報告

## US-0004-0002: ディレクトリ構造診断

- Parent: CAP-0004
- Goal: `qfai doctor` で .qfai/ 配下の必要ディレクトリ（specs/, contracts/, discussion/, evidence/ 等）の存在をチェックする
- Non-goals: 設定ファイルチェック、パス解決チェック、レガシー警告
- Notes: 欠落ディレクトリは warning として報告し、suggested_action で作成方法を提示

## US-0004-0003: パス解決診断

- Parent: CAP-0004
- Goal: `qfai doctor` で設定ファイル内のパス（specsDir, contractsDir, testsDir 等）が実際に存在するディレクトリに解決されるかチェックする
- Non-goals: 設定ファイルチェック、ディレクトリ構造チェック、レガシー警告
- Notes: root からの相対パスとして解決。パストラバーサル（root 外参照）も検出

## US-0004-0004: レガシー警告

- Parent: CAP-0004
- Goal: `qfai doctor` で v1.4.25 以前のレガシーファイルレイアウト（spec-pack 形式、非推奨ディレクトリ等）を検出し、警告を出力する
- Non-goals: 設定ファイルチェック、ディレクトリ構造チェック、パス解決チェック
- Notes: 情報レベル（info）の警告として報告。移行手順の suggested_action を含む

## US-0004-0005: JSON 診断出力

- Parent: CAP-0004
- Goal: `qfai doctor --format json` で全診断結果を機械可読な JSON 形式で stdout に出力する
- Non-goals: テキスト形式出力の制御
- Notes: CI/CD パイプラインやツール連携での自動処理を想定
