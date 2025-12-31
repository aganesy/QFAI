---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# プロジェクト構成（QFAI Toolkit）

QFAI Toolkit は CLI と検証エンジンを単一パッケージとして配布するモノレポです。

## リポジトリ概要

- `packages/qfai/`: CLI とコア（npm 配布対象）
- `packages/qfai/assets/init/`: `qfai init` のテンプレート（`.qfai/` と `qfai.config.yaml` など）
- `docs/`: ルール/スキーマ/ロードマップ/運用ガイド
- `scripts/`: パック検証などの補助スクリプト
- `tmp/`: 作業用ディレクトリ（成果物対象外）

## packages/qfai の構成

```
packages/qfai/
  src/
    cli/
      commands/   # init / validate / report
      lib/        # args/logger 等の共通処理
    core/
      validators/ # spec/delta/scenario/contracts/traceability/ids
      parse/      # spec/delta/scenario のパース
      gherkin/    # Gherkin モデル補助
  assets/
    init/         # init テンプレート
  tests/
    cli/          # CLI テスト
    core/         # コア検証テスト
```

## 実行フロー

- `qfai init` は `assets/init` をコピーしてテンプレートを生成する
- `qfai validate` は `core/validators` を集約して `.qfai/out/validate.json` を出力する
- `qfai report` は `validate.json` を読み込み、Markdown/JSON を生成する
