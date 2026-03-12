# 06_REQ

## Priority Legend

| Priority | Meaning                    |
| -------- | -------------------------- |
| must     | 必須（リリースブロッカー） |
| should   | 推奨（品質向上に寄与）     |
| could    | あれば望ましい             |
| wont     | 今回は対象外               |

## Requirements

### CLI Commands

| REQ-ID   | Title                        | Description                                                                                               | Source             | Priority | Status   |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ | -------- | -------- |
| REQ-0001 | プロジェクト初期化           | `qfai init` で `.qfai/` ディレクトリ構造、設定ファイル、ラッパーを生成する                                | SRC-0010           | must     | approved |
| REQ-0002 | 初期化の冪等性               | 2回目以降の `qfai init` は既存ファイルをスキップし、新規ファイルのみ追加する                              | SRC-0010           | must     | approved |
| REQ-0003 | 強制更新                     | `qfai init --force` でスキルファイルを最新版に上書き更新する（skills.local/ は保護）                      | SRC-0010           | must     | approved |
| REQ-0004 | ドライラン                   | `qfai init --dry-run` で変更内容をプレビューし、実際のファイル操作を行わない                              | SRC-0010           | should   | approved |
| REQ-0005 | マルチツールラッパー生成     | Claude Code, GitHub Copilot, Codex, Anthropic Agents 用のラッパーファイルを生成する                       | SRC-0010           | must     | approved |
| REQ-0006 | レガシーファイル退避         | 非推奨ファイル（10_workflow.md 等）の検出・退避を行う                                                     | SRC-0010           | should   | approved |
| REQ-0010 | スペックバリデーション       | `qfai validate` で全バリデータ（33+）を順次実行し、Issue[] を集約する                                     | SRC-0008, SRC-0009 | must     | approved |
| REQ-0011 | バリデーションフェーズ       | `--phase full\|atdd\|tdd\|refinement` でバリデーションスコープを制御する                                  | SRC-0010           | must     | approved |
| REQ-0012 | 終了コード制御               | `--fail-on error\|warning\|never` でバリデーション結果に基づく終了コードを制御する                        | SRC-0010           | must     | approved |
| REQ-0013 | GitHub Actions 出力          | `--format github` で GitHub Actions ワークフローアノテーション形式（最大100件）で出力する                 | SRC-0010           | must     | approved |
| REQ-0014 | バリデーション結果 JSON 出力 | `validate.json` に構造化されたバリデーション結果を出力する                                                | SRC-0010           | must     | approved |
| REQ-0015 | ランログ生成                 | `.qfai/report/run-*/` にタイムスタンプ付きの実行ログを保存する                                            | SRC-0010           | should   | approved |
| REQ-0020 | レポート生成（Markdown）     | `qfai report --format md` でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスを出力      | SRC-0010           | must     | approved |
| REQ-0021 | レポート生成（JSON）         | `qfai report --format json` で構造化レポートデータを出力する                                              | SRC-0010           | must     | approved |
| REQ-0022 | リポジトリリンク付与         | `qfai report --base-url` でファイルパスにリポジトリ URL リンクを付与する                                  | SRC-0010           | should   | approved |
| REQ-0023 | 内部バリデーション実行       | `qfai report --run-validate` でレポート生成前にバリデーションを内部実行する                               | SRC-0010           | should   | approved |
| REQ-0030 | 診断ツール                   | `qfai doctor` で設定ファイル、ディレクトリ構造、パス解決の診断を実行する                                  | SRC-0010           | must     | approved |
| REQ-0031 | 診断 JSON 出力               | `qfai doctor --format json` で機械可読な診断結果を出力する                                                | SRC-0010           | should   | approved |
| REQ-0040 | ガードレール抽出             | `qfai guardrails` で list/extract/check 操作を提供する                                                    | SRC-0010           | should   | approved |
| REQ-0050 | UI フィデリティ自動生成      | `qfai prototyping --autogen-ui-fidelity` で jsdom による DOM クローリングで UI フィデリティ証跡を生成する | SRC-0010           | should   | approved |
| REQ-0051 | UI コントラクト期待値抽出    | `.qfai/contracts/ui/` からの YAML パースで期待ラベル・エレメントを抽出する                                | SRC-0009           | should   | approved |
| REQ-0052 | エレメントマーカー検出       | `data-qfai` 属性によるエレメントマーカーを DOM から検出する                                               | SRC-0009           | should   | approved |

### Validation Rules

| REQ-ID   | Title                         | Description                                                                                                    | Source   | Priority | Status   |
| -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| REQ-0100 | スペック必須ファイル検証      | レイヤードスペック（01_Spec ~ 09_delta）および \_policies（01_Objective ~ 10_delta）の必須ファイル存在チェック | SRC-0008 | must     | approved |
| REQ-0101 | ID フォーマット検証           | CAP-XXXX, US-XXXX, AC-XXXX, BR-XXXX, EX-XXXX, TC-XXXX の形式チェック・重複チェック                             | SRC-0008 | must     | approved |
| REQ-0102 | トレーサビリティエッジ検証    | AC→TC, BR→EX, EX→TC, Spec→CAP の参照整合性チェック                                                             | SRC-0008 | must     | approved |
| REQ-0103 | ATDD コードアノテーション検証 | テストファイル内の QFAI:SPEC-XXXX:US-YYYY / TC-YYYY / CON-API-XXXX アノテーション検証                          | SRC-0008 | must     | approved |
| REQ-0104 | ディスカッションパック検証    | 15ファイル存在、内容充足、blocking OQ 検出、Mermaid 図存在チェック                                             | SRC-0008 | must     | approved |
| REQ-0105 | コントラクト検証              | UI/API/DB コントラクト ID の形式・重複・参照整合性チェック                                                     | SRC-0008 | must     | approved |
| REQ-0106 | レビューアーティファクト検証  | review-pack 構造（review*request.md, summary.json, Rxx*\*.md）の存在・スキーマチェック                         | SRC-0008 | must     | approved |
| REQ-0107 | プロトタイピング証跡検証      | prototyping.json / prototyping.md の存在・スキーマ・カバレッジチェック                                         | SRC-0008 | should   | approved |
| REQ-0108 | Mermaid 図形式検証            | mermaid フェンスブロックの存在・形式チェック（discussion / spec 全体）                                         | SRC-0008 | must     | approved |
| REQ-0109 | レガシー形式検出              | spec-pack / v1.4.16 以前のレイアウト検出・移行警告                                                             | SRC-0008 | should   | approved |
| REQ-0110 | ウェイバー適用                | waivers.yml に基づく Issue の suppress / downgrade 処理                                                        | SRC-0009 | must     | approved |
| REQ-0111 | リポジトリ衛生チェック        | レガシーディレクトリエイリアス・テンプレート残留物の検出                                                       | SRC-0008 | should   | approved |
| REQ-0112 | ビジネスフロー Mermaid 必須   | `_policies/04_Business-Flow.md` に mermaid ブロック必須                                                        | SRC-0008 | must     | approved |

### Configuration

| REQ-ID   | Title                | Description                                                                 | Source   | Priority | Status   |
| -------- | -------------------- | --------------------------------------------------------------------------- | -------- | -------- | -------- |
| REQ-0200 | 設定ファイル読み込み | `qfai.config.yaml` の読み込み・バリデーション・デフォルト値適用             | SRC-0009 | must     | approved |
| REQ-0201 | パス解決             | 設定ファイル内のパスを root からの相対パスとして解決する                    | SRC-0009 | must     | approved |
| REQ-0202 | 上位ディレクトリ探索 | CWD から上位に向かって qfai.config.yaml を探索する                          | SRC-0009 | must     | approved |
| REQ-0203 | テスト戦略設定       | requireLayerTags, requireSizeTags, maxE2eScenarioRatio/Count の設定         | SRC-0003 | should   | approved |
| REQ-0204 | トレーサビリティ設定 | brMustHaveSc, scMustHaveTest, testFileGlobs, orphanContractsPolicy 等の設定 | SRC-0003 | must     | approved |

### Asset System

| REQ-ID   | Title                    | Description                                                                                 | Source   | Priority | Status   |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| REQ-0300 | テンプレートアセット管理 | `packages/qfai/assets/init/` にカノニカルテンプレートを管理する                             | SRC-0007 | must     | approved |
| REQ-0301 | スキル整合性検証         | init 時にスキルファイルのドリフトプロトコルマーカー・Reviewer Gate セクション存在をチェック | SRC-0008 | must     | approved |
| REQ-0302 | アシスタントアセット検証 | drift-protocol.md, test-layers.md 等の必須インストラクションファイルの存在チェック          | SRC-0008 | must     | approved |
