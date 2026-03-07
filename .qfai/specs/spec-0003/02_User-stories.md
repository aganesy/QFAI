# 02 User Stories

## US Catalog

- US-0003-0001: Markdown レポート生成 - --format md でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックス出力
- US-0003-0002: JSON レポート生成 - --format json で構造化レポートデータ出力
- US-0003-0003: リポジトリリンク付与 - --base-url でファイルパスにリポジトリ URL リンク付与
- US-0003-0004: 内部バリデーション実行 - --run-validate でレポート生成前にバリデーション内部実行

## US-0003-0001: Markdown レポート生成

- Parent: CAP-0003
- Goal: `qfai report --format md` でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスを含む Markdown レポートを stdout に出力する
- Non-goals: JSON 出力、リポジトリリンク付与、バリデーション実行
- Notes: validate.json が入力として必要。出力はパイプやリダイレクトで保存可能

## US-0003-0002: JSON レポート生成

- Parent: CAP-0003
- Goal: `qfai report --format json` で構造化されたレポートデータを JSON 形式で stdout に出力する
- Non-goals: Markdown 出力、リポジトリリンク付与、バリデーション実行
- Notes: CI/CD パイプラインやツール連携での機械可読な出力を提供

## US-0003-0003: リポジトリリンク付与

- Parent: CAP-0003
- Goal: `qfai report --base-url <url>` でレポート内のファイルパスにリポジトリ URL リンクを付与する
- Non-goals: レポートフォーマットの決定、バリデーション実行
- Notes: --format md と --format json の両方で適用可能。GitHub / GitLab 等のリポジトリ URL に対応

## US-0003-0004: 内部バリデーション実行

- Parent: CAP-0003
- Goal: `qfai report --run-validate` でレポート生成前にバリデーションを内部的に実行し、その結果を元にレポートを生成する
- Non-goals: 外部 validate.json の読み込み（--run-validate 指定時）
- Notes: validate.json が存在しない場合に --run-validate を指定せずに実行するとエラーとなる
