# 02 User Stories

## US Catalog

- US-0003-0001: Markdown レポート生成 - --format md でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックス出力
- US-0003-0002: JSON レポート生成 - --format json で構造化レポートデータ出力
- US-0003-0003: リポジトリリンク付与 - --base-url でファイルパスにリポジトリ URL リンク付与
- US-0003-0004: 内部バリデーション実行 - --run-validate でレポート生成前にバリデーション内部実行

## US-0003-0001: Markdown レポート生成

- Parent: CAP-0003
- Goal: `qfai report --format md` でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスを含む Markdown レポートファイルを生成する
- Non-goals: JSON 出力、リポジトリリンク付与、バリデーション実行
- Notes: 入力は `config.output.validateJsonPath`（既定: `.qfai/report/validate.json`）、出力は `paths.outDir/report.md`（既定: `.qfai/report/report.md`）

## US-0003-0002: JSON レポート生成

- Parent: CAP-0003
- Goal: `qfai report --format json` で構造化されたレポートデータを JSON レポートファイルとして生成する
- Non-goals: Markdown 出力、リポジトリリンク付与、バリデーション実行
- Notes: 出力先は `paths.outDir/report.json`（既定: `.qfai/report/report.json`）で、CI/CD やツール連携向けの機械可読データを提供する

## US-0003-0003: リポジトリリンク付与

- Parent: CAP-0003
- Goal: `qfai report --base-url <url>` でレポート内のファイルパスにリポジトリ URL リンクを付与する
- Non-goals: レポートフォーマットの決定、バリデーション実行
- Notes: --format md と --format json の両方で適用可能。GitHub / GitLab 等のリポジトリ URL に対応

## US-0003-0004: 内部バリデーション実行

- Parent: CAP-0003
- Goal: `qfai report --run-validate` でレポート生成前にバリデーションを内部的に実行し、その結果を元にレポートを生成する
- Non-goals: 外部 validate.json の読み込み（--run-validate 指定時）
- Notes: `--run-validate` 未指定で入力ファイルが見つからない場合は終了コード 2 を返す
