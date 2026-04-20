# 02 User Stories

## US Catalog

- US-0005-0001: Markdown レポート生成 - --format md でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックス出力
- US-0005-0002: JSON レポート生成 - --format json で構造化レポートデータ出力
- US-0005-0003: リポジトリリンク付与 - --base-url でファイルパスにリンク付与
- US-0005-0004: 内部バリデーション実行 - --run-validate でバリデーション + レポートを一括実行
- US-0005-0005: validate.json 入力 - --in で既存の validate.json を入力として使用
- US-0005-0006: 出力パス制御 - --out でレポート出力先を制御
- US-0005-0007: spec-pack レポート生成 - spec 単位のレポートも出力

## US-0005-0001: Markdown レポート生成

- Parent: CAP-0005
- Goal: `qfai report --format md` でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスを含む report.md を `paths.outDir` 配下に生成する
- Non-goals: レポートのカスタムテンプレート
- Notes: デフォルトフォーマットは md

## US-0005-0002: JSON レポート生成

- Parent: CAP-0005
- Goal: `qfai report --format json` で構造化レポートデータを report.json として出力する
- Non-goals: JSON Schema の外部公開

## US-0005-0003: リポジトリリンク付与

- Parent: CAP-0005
- Goal: `--base-url <url>` でレポート内のファイルパスにリポジトリ URL リンクを付与する
- Non-goals: リンクの自動検証

## US-0005-0004: 内部バリデーション実行

- Parent: CAP-0005
- Goal: `--run-validate` でバリデーションを内部実行し、その結果でレポートを生成する。`--in` は無視される
- Non-goals: バリデーションオプションの全転送

## US-0005-0005: validate.json 入力

- Parent: CAP-0005
- Goal: `--in <path>` または config.output.validateJsonPath で指定された validate.json を入力としてレポートを生成する
- Non-goals: validate.json の自動生成
- Notes: ファイルが存在しない場合はエラーメッセージを表示し exit 2

## US-0005-0006: 出力パス制御

- Parent: CAP-0005
- Goal: `--out <path>` でレポートの出力先を制御する。未指定時は config の outDir + report.md/json
- Non-goals: ディレクトリ単位の出力先制御

## US-0005-0007: spec-pack レポート生成

- Parent: CAP-0005
- Goal: レポート生成後に writeSpecPackReports() で spec 単位のレポートも出力する
- Non-goals: spec-pack レポートのフォーマットカスタマイズ

## US-0005-0008: Prototyping Observability Section

As a project lead, I want `qfai report` to include a `## Prototyping` section showing mode resolution, obligation profile, evidence coverage, and runtime details, so that I can understand the prototyping state at a glance.
